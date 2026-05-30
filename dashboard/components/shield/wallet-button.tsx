"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function WalletButton({ className }: { className?: string }) {
  const {
    publicKey,
    connected,
    connecting,
    disconnecting,
    wallets,
    wallet,
    select,
    connect,
    disconnect,
  } = useWallet();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-connect after the user picks a wallet from the dropdown.
  useEffect(() => {
    if (wallet && !connected && !connecting) {
      connect().catch(() => {
        // user cancelled / wallet not approved; silent
      });
    }
  }, [wallet, connected, connecting, connect]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ── Connected ──
  if (connected && publicKey) {
    const pk = publicKey.toBase58();
    const short = `${pk.slice(0, 4)}…${pk.slice(-4)}`;

    async function handleCopy() {
      try {
        await navigator.clipboard.writeText(pk);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard unavailable; surface nothing
      }
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          "inline-flex min-w-0 items-center gap-2 whitespace-nowrap",
          className
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={
                copied
                  ? `Copied wallet address ${pk}`
                  : `Copy wallet address ${pk}`
              }
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 transition-colors duration-200 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              />
              <span className="font-mono text-[12px] leading-none tabular-nums text-foreground">
                {short}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            {copied ? "copied" : "copy address"}
          </TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={() => disconnect()}
          disabled={disconnecting}
          className={cn(
            "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-sm px-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            disconnecting
              ? "cursor-not-allowed text-muted-foreground/50"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {disconnecting ? "…" : "disconnect"}
        </button>
      </div>
    );
  }

  // ── Connecting ──
  if (connecting) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60"
        />
        <span
          className="font-mono text-[12px] text-muted-foreground"
          aria-live="polite"
        >
          connecting…
        </span>
      </div>
    );
  }

  // ── Disconnected ──
  return (
    <div
      ref={containerRef}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span className="font-mono text-[12px] text-muted-foreground">
        demo signer
      </span>
      <span aria-hidden className="text-border">
        ·
      </span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Connect a wallet"
          className="inline-flex h-7 items-center rounded-sm px-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          connect
          <span
            aria-hidden
            className={cn(
              "ml-1 inline-block text-[9px] transition-transform duration-200",
              open && "rotate-180"
            )}
          >
            ▾
          </span>
        </button>
        {open && (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-card shadow-xl"
          >
            {wallets.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                No Solana wallet detected. Install{" "}
                <a
                  href="https://phantom.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Phantom
                </a>{" "}
                or another Wallet Standard wallet.
              </p>
            ) : (
              <ul className="py-1">
                {wallets.map((w) => (
                  <li key={w.adapter.name}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        select(w.adapter.name);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                    >
                      {w.adapter.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.adapter.icon}
                          alt=""
                          width={20}
                          height={20}
                          className="h-5 w-5 shrink-0 rounded-sm"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="inline-block h-5 w-5 shrink-0 rounded-sm bg-border"
                        />
                      )}
                      <span>{w.adapter.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
