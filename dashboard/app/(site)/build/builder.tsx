"use client";

import { useEffect, useState, useTransition } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "@/lib/utils";
import type { GuardSlug } from "@/lib/build/form-spec";
import { guardForms } from "@/lib/build/form-spec";
import { simulateShieldedTransaction, type SimulationResult } from "./actions";
import { ResultPanel } from "./result-panel";
import { WalletButton } from "@/components/shield/wallet-button";
import { PUBLIC_FEE_PAYER } from "@/lib/build/program-ids";
import { useUserTokens } from "@/lib/build/use-user-tokens";
import { formatTokenAmount, tokenLabel } from "@/lib/build/tokens";
import type { UserToken } from "@/lib/build/tokens";
import { PROGRAM_ID_STRINGS } from "@/lib/build/program-ids";
import { IconCopyButton } from "@/components/shield/icon-copy-button";

const CLIENT_RPC_URLS: Record<"devnet" | "mainnet", string> = {
  devnet:
    process.env.NEXT_PUBLIC_HELIUS_DEVNET_RPC ||
    "https://api.devnet.solana.com",
  mainnet:
    process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC ||
    "https://api.mainnet-beta.solana.com",
};

type EnabledMap = Record<GuardSlug, boolean>;
type ParamsMap = Record<GuardSlug, Record<string, string>>;

function initialEnabled(): EnabledMap {
  return guardForms.reduce((acc, f) => {
    acc[f.slug] = false;
    return acc;
  }, {} as EnabledMap);
}

function initialParams(): ParamsMap {
  return guardForms.reduce((acc, f) => {
    acc[f.slug] = f.fields.reduce(
      (fieldAcc, field) => {
        fieldAcc[field.name] = field.defaultValue;
        return fieldAcc;
      },
      {} as Record<string, string>
    );
    return acc;
  }, {} as ParamsMap);
}

export function Builder() {
  const { publicKey } = useWallet();
  const walletPubkey = publicKey?.toBase58() ?? null;

  const [network, setNetwork] = useState<"devnet" | "mainnet">("devnet");
  const [enabled, setEnabled] = useState<EnabledMap>(initialEnabled);
  const [params, setParams] = useState<ParamsMap>(initialParams);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [autoMaxSlot, setAutoMaxSlot] = useState(true);
  const [balanceFloorLamports, setBalanceFloorLamports] = useState<
    bigint | null
  >(null);
  const balanceAccountRaw = params.balance_floor?.account ?? "";

  const {
    tokens: userTokens,
    loading: tokensLoading,
    refresh: refreshTokens,
  } = useUserTokens(walletPubkey, network, CLIENT_RPC_URLS[network]);

  // Keep program_allowlist's allowed-list synced with the set of currently
  // enabled Shield guards. The user does not manage these manually; they are
  // auto-included when a guard is toggled on, auto-removed when toggled off.
  // Non-Shield entries (System Program, ComputeBudget, custom pubkeys typed
  // by the user) are preserved.
  useEffect(() => {
    const allGuardPids = new Set<string>(
      guardForms
        .filter((g) => g.slug !== "program_allowlist")
        .map((g) => PROGRAM_ID_STRINGS[g.slug])
    );
    const enabledGuardPids = guardForms
      .filter((g) => g.slug !== "program_allowlist" && enabled[g.slug])
      .map((g) => PROGRAM_ID_STRINGS[g.slug]);

    setParams((prev) => {
      const currentList = (prev.program_allowlist?.allowed ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const nonGuardEntries = currentList.filter((p) => !allGuardPids.has(p));
      const nextList = [...nonGuardEntries, ...enabledGuardPids];
      const nextAllowed = nextList.join("\n");
      if (nextAllowed === prev.program_allowlist?.allowed) return prev;
      return {
        ...prev,
        program_allowlist: {
          ...prev.program_allowlist,
          allowed: nextAllowed,
        },
      };
    });
  }, [enabled]);

  // If the user disconnects while signer_allowlist is enabled, turn it off
  // automatically so the form stays in a coherent state.
  useEffect(() => {
    if (!walletPubkey && enabled.signer_allowlist) {
      setEnabled((prev) => ({ ...prev, signer_allowlist: false }));
    }
  }, [walletPubkey, enabled.signer_allowlist]);

  useEffect(() => {
    let cancelled = false;
    setCurrentSlot(null);
    const connection = new Connection(CLIENT_RPC_URLS[network], "confirmed");

    // Seed the initial value via HTTP so the field populates immediately,
    // then let the WebSocket subscription push every slot from there.
    connection
      .getSlot()
      .then((slot) => {
        if (!cancelled) setCurrentSlot(slot);
      })
      .catch(() => {
        // public RPC may rate-limit; ignore, subscription will catch up
      });

    const subscriptionId = connection.onSlotChange((info) => {
      if (!cancelled) setCurrentSlot(info.slot);
    });

    return () => {
      cancelled = true;
      connection.removeSlotChangeListener(subscriptionId).catch(() => {});
    };
  }, [network]);

  // Live balance for the account that balance_floor is checking. Only fetches
  // when the user has explicitly entered an account; staying empty means
  // "defaults to the demo fee payer server-side" without leaking the demo
  // wallet's balance into the UI. Pushed via accountSubscribe so the value
  // ticks if the account is funded or drained while the page is open.
  useEffect(() => {
    const trimmed = balanceAccountRaw.trim();
    if (!enabled.balance_floor || !trimmed) {
      setBalanceFloorLamports(null);
      return;
    }

    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(trimmed);
    } catch {
      setBalanceFloorLamports(null);
      return;
    }

    let cancelled = false;
    setBalanceFloorLamports(null);
    const connection = new Connection(CLIENT_RPC_URLS[network], "confirmed");

    connection
      .getBalance(pubkey)
      .then((lamports) => {
        if (!cancelled) setBalanceFloorLamports(BigInt(lamports));
      })
      .catch(() => {});

    const subId = connection.onAccountChange(pubkey, (info) => {
      if (!cancelled) setBalanceFloorLamports(BigInt(info.lamports));
    });

    return () => {
      cancelled = true;
      connection.removeAccountChangeListener(subId).catch(() => {});
    };
  }, [enabled.balance_floor, balanceAccountRaw, network]);

  const anyEnabled = Object.values(enabled).some(Boolean);

  function toggleGuard(slug: GuardSlug) {
    if (slug === "signer_allowlist" && !walletPubkey) return; // gated on wallet
    setEnabled((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  function updateField(slug: GuardSlug, field: string, value: string) {
    setParams((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  }

  function toggleAutoMaxSlot() {
    setAutoMaxSlot((prev) => {
      const next = !prev;
      // Going auto -> manual: snapshot the live value so the user has a
      // starting point in the editable field.
      if (prev && currentSlot !== null) {
        updateField("slot_deadline", "maxSlot", String(currentSlot + 100));
      }
      return next;
    });
  }

  function handleSimulate() {
    setResult(null);
    // In auto mode, send an empty maxSlot so the server resolves it against
    // its own getSlot() at simulate time. Avoids client/server clock skew.
    const submittedParams: ParamsMap = autoMaxSlot
      ? {
          ...params,
          slot_deadline: { ...params.slot_deadline, maxSlot: "" },
        }
      : params;
    startTransition(async () => {
      const res = await simulateShieldedTransaction({
        network,
        enabled,
        params: submittedParams,
        signerOverride: walletPubkey ?? undefined,
      });
      setResult(res);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <section
          aria-label="Simulation context"
          className="rounded-md border border-border bg-card"
        >
          <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
            <div className="flex flex-1 items-center gap-3 px-4 py-3">
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                network
              </span>
              <div
                role="group"
                aria-label="Network"
                className="inline-flex gap-1.5"
              >
                {(["devnet", "mainnet"] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNetwork(n)}
                    aria-pressed={network === n}
                    className={cn(
                      "inline-flex h-9 items-center justify-center rounded-sm border px-3 font-mono text-[13px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      network === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-1 items-center gap-3 px-4 py-3">
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                signer
              </span>
              <WalletButton />
            </div>
          </div>
        </section>

        <ul className="flex flex-col gap-3">
          {guardForms.map((g) => (
            <li key={g.slug}>
              <GuardRow
                form={g}
                enabled={enabled[g.slug]}
                params={params[g.slug]}
                network={network}
                currentSlot={currentSlot}
                autoMaxSlot={autoMaxSlot}
                walletPubkey={walletPubkey}
                balanceFloorLamports={balanceFloorLamports}
                userTokens={userTokens}
                tokensLoading={tokensLoading}
                onRefreshTokens={refreshTokens}
                onToggleAutoMaxSlot={toggleAutoMaxSlot}
                onToggle={() => toggleGuard(g.slug)}
                onChange={(field, value) =>
                  updateField(g.slug, field, value)
                }
              />
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <button
            type="button"
            onClick={handleSimulate}
            disabled={isPending || !anyEnabled}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-md border px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isPending || !anyEnabled
                ? "cursor-not-allowed border-border bg-secondary text-muted-foreground/60"
                : "border-primary bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {isPending ? "Simulating..." : "Simulate shielded transaction"}
          </button>
          {!anyEnabled && (
            <span className="font-mono text-[11px] text-muted-foreground">
              enable at least one guard
            </span>
          )}
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="sticky top-6">
          <ResultPanel result={result} />
        </div>
      </div>
    </div>
  );
}

function GuardRow({
  form,
  enabled,
  params,
  network,
  currentSlot,
  autoMaxSlot,
  walletPubkey,
  balanceFloorLamports,
  userTokens,
  tokensLoading,
  onRefreshTokens,
  onToggleAutoMaxSlot,
  onToggle,
  onChange,
}: {
  form: (typeof guardForms)[number];
  enabled: boolean;
  params: Record<string, string>;
  network: "devnet" | "mainnet";
  currentSlot: number | null;
  autoMaxSlot: boolean;
  walletPubkey: string | null;
  balanceFloorLamports: bigint | null;
  userTokens: UserToken[] | null;
  tokensLoading: boolean;
  onRefreshTokens: () => void;
  onToggleAutoMaxSlot: () => void;
  onToggle: () => void;
  onChange: (field: string, value: string) => void;
}) {
  const gatedByWallet =
    form.slug === "signer_allowlist" && walletPubkey === null;
  return (
    <article
      className={cn(
        "rounded-md border bg-card transition-colors",
        enabled ? "border-primary/60" : "border-border"
      )}
    >
      <header className="flex items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-mono text-sm font-semibold tracking-tight text-foreground">
              {form.name}
            </h3>
            <IconCopyButton
              value={PROGRAM_ID_STRINGS[form.slug]}
              label="copy program id"
              copiedLabel="copied"
              ariaLabelPrefix={`Copy ${form.name} program id`}
            />
          </div>
          <p className="text-sm text-muted-foreground">{form.oneLiner}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {gatedByWallet
              ? "Connect a wallet to enable this guard."
              : `fails when ${form.failsWhen}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          disabled={gatedByWallet}
          aria-label={
            gatedByWallet
              ? "Connect a wallet to enable signer_allowlist"
              : `Toggle ${form.name}`
          }
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-full border px-3 font-mono text-[11px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            gatedByWallet
              ? "cursor-not-allowed border-border bg-secondary text-muted-foreground/50"
              : enabled
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {gatedByWallet ? "locked" : enabled ? "on" : "off"}
        </button>
      </header>
      {enabled && (
        <div className="flex flex-col gap-4 border-t border-border p-4">
          {form.slug === "slippage" && walletPubkey && (
            <div className="flex flex-col gap-3 rounded-sm border border-border bg-secondary px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  your tokens · {network}
                </p>
                <button
                  type="button"
                  onClick={onRefreshTokens}
                  disabled={tokensLoading}
                  className={cn(
                    "inline-flex h-6 items-center rounded-sm px-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    tokensLoading
                      ? "cursor-not-allowed text-muted-foreground/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tokensLoading ? "loading…" : "refresh"}
                </button>
              </div>
              {!userTokens && tokensLoading && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  fetching token accounts…
                </p>
              )}
              {userTokens && userTokens.length === 0 && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  no token accounts found on this network.
                </p>
              )}
              {userTokens && userTokens.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {userTokens.map((t) => {
                    const selected = params.tokenAccount?.trim() === t.pubkey;
                    return (
                      <button
                        key={t.pubkey}
                        type="button"
                        onClick={() => onChange("tokenAccount", t.pubkey)}
                        title={`ATA ${t.pubkey}\nMint ${t.mint}`}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            selected ? "bg-primary" : "bg-muted-foreground/40"
                          )}
                        />
                        <span className="text-foreground">{tokenLabel(t)}</span>
                        <span className="tabular-nums">
                          {formatTokenAmount(t)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {form.slug === "balance_floor" &&
            (params.account ?? "").trim() !== "" && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-secondary px-3 py-2">
                <p className="font-mono text-[11px] text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn(
                      "mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle",
                      balanceFloorLamports !== null
                        ? "bg-primary"
                        : "bg-muted-foreground/40"
                    )}
                  />
                  balance · {network} ·{" "}
                  <span className="tabular-nums text-foreground">
                    {balanceFloorLamports !== null
                      ? `${(Number(balanceFloorLamports) / 1e9).toFixed(4)} SOL`
                      : "…"}
                  </span>
                  {balanceFloorLamports !== null && (
                    <span className="ml-2 text-muted-foreground/70">
                      ({balanceFloorLamports.toLocaleString()} lamports)
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  disabled={balanceFloorLamports === null}
                  onClick={() =>
                    onChange(
                      "minLamports",
                      String((balanceFloorLamports ?? 0n) + 1n)
                    )
                  }
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    balanceFloorLamports === null
                      ? "cursor-not-allowed border-border bg-secondary text-muted-foreground/60"
                      : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  use balance + 1
                </button>
              </div>
            )}
          {form.slug === "signer_allowlist" && walletPubkey && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-secondary px-3 py-2">
              <p className="font-mono text-[11px] text-muted-foreground">
                <span
                  aria-hidden
                  className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle"
                />
                signer{" "}
                <span className="text-foreground">
                  {walletPubkey.slice(0, 4)}…{walletPubkey.slice(-4)}
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  const current = (params.allowed ?? "").trim();
                  const next = current
                    ? `${current}\n${walletPubkey}`
                    : walletPubkey;
                  onChange("allowed", next);
                }}
                className="inline-flex h-7 items-center rounded-full border border-border bg-card px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                add to allowlist
              </button>
            </div>
          )}
          {form.slug === "slot_deadline" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-secondary px-3 py-2">
              <p className="font-mono text-[11px] text-muted-foreground">
                <span
                  aria-hidden
                  className={cn(
                    "mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle",
                    currentSlot !== null
                      ? "bg-primary"
                      : "bg-muted-foreground/40"
                  )}
                />
                live · {network} ·{" "}
                <span className="tabular-nums text-foreground">
                  {currentSlot !== null ? currentSlot.toLocaleString() : "…"}
                </span>
              </p>
              <button
                type="button"
                onClick={onToggleAutoMaxSlot}
                aria-pressed={autoMaxSlot}
                className={cn(
                  "inline-flex h-7 items-center rounded-full border px-3 font-mono text-[10px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  autoMaxSlot
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                use slot + 100
              </button>
            </div>
          )}
          {form.fields.map((field) => {
            const isMultiline = field.type === "pubkey-list";
            const id = `${form.slug}-${field.name}`;
            const isSlotDeadlineMax =
              form.slug === "slot_deadline" && field.name === "maxSlot";
            const locked = isSlotDeadlineMax && autoMaxSlot;
            const displayedValue = isSlotDeadlineMax && autoMaxSlot
              ? currentSlot !== null
                ? String(currentSlot + 100)
                : ""
              : params[field.name] ?? "";

            return (
              <label key={field.name} className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {field.label}
                </span>
                {isMultiline ? (
                  <textarea
                    id={id}
                    rows={3}
                    value={params[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className="resize-y rounded-sm border border-border bg-secondary px-3 py-2 font-mono text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    spellCheck={false}
                  />
                ) : (
                  <input
                    id={id}
                    type="text"
                    value={displayedValue}
                    placeholder={
                      locked
                        ? currentSlot !== null
                          ? "live"
                          : "loading…"
                        : field.placeholder
                    }
                    onChange={(e) => onChange(field.name, e.target.value)}
                    readOnly={locked}
                    aria-readonly={locked}
                    className={cn(
                      "h-11 rounded-sm border bg-secondary px-3 font-mono text-[13px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      locked
                        ? "border-border text-muted-foreground/80"
                        : "border-border text-foreground"
                    )}
                    spellCheck={false}
                    inputMode={
                      field.type === "bigint" || field.type === "number"
                        ? "numeric"
                        : "text"
                    }
                  />
                )}
                {field.helper && !locked && (
                  <span className="text-[11px] text-muted-foreground">
                    {field.helper}
                  </span>
                )}
                {locked && (
                  <span className="text-[11px] text-muted-foreground">
                    Auto mode: synced to the live slot on every poll. Toggle off
                    to enter a custom value.
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </article>
  );
}
