"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { GuardSlug } from "@/lib/build/form-spec";
import { guardForms } from "@/lib/build/form-spec";
import { simulateShieldedTransaction, type SimulationResult } from "./actions";
import { ResultPanel } from "./result-panel";

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
  const [network, setNetwork] = useState<"devnet" | "mainnet">("devnet");
  const [enabled, setEnabled] = useState<EnabledMap>(initialEnabled);
  const [params, setParams] = useState<ParamsMap>(initialParams);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const anyEnabled = Object.values(enabled).some(Boolean);

  function toggleGuard(slug: GuardSlug) {
    setEnabled((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  function updateField(slug: GuardSlug, field: string, value: string) {
    setParams((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  }

  function handleSimulate() {
    setResult(null);
    startTransition(async () => {
      const res = await simulateShieldedTransaction({
        network,
        enabled,
        params,
      });
      setResult(res);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <fieldset className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
          <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            network
          </legend>
          <div className="flex gap-2">
            {(["devnet", "mainnet"] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNetwork(n)}
                aria-pressed={network === n}
                className={cn(
                  "inline-flex h-9 flex-1 items-center justify-center rounded-sm border px-3 font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  network === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <ul className="flex flex-col gap-3">
          {guardForms.map((g) => (
            <li key={g.slug}>
              <GuardRow
                form={g}
                enabled={enabled[g.slug]}
                params={params[g.slug]}
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
  onToggle,
  onChange,
}: {
  form: (typeof guardForms)[number];
  enabled: boolean;
  params: Record<string, string>;
  onToggle: () => void;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <article
      className={cn(
        "rounded-md border bg-card transition-colors",
        enabled ? "border-primary/60" : "border-border"
      )}
    >
      <header className="flex items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-mono text-sm font-semibold tracking-tight text-foreground">
            {form.name}
          </h3>
          <p className="text-sm text-muted-foreground">{form.oneLiner}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            fails when {form.failsWhen}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-full border px-3 font-mono text-[11px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            enabled
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {enabled ? "on" : "off"}
        </button>
      </header>
      {enabled && (
        <div className="flex flex-col gap-4 border-t border-border p-4">
          {form.fields.map((field) => {
            const isMultiline = field.type === "pubkey-list";
            const id = `${form.slug}-${field.name}`;
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
                    value={params[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className="h-11 rounded-sm border border-border bg-secondary px-3 font-mono text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    spellCheck={false}
                    inputMode={
                      field.type === "bigint" || field.type === "number"
                        ? "numeric"
                        : "text"
                    }
                  />
                )}
                {field.helper && (
                  <span className="text-[11px] text-muted-foreground">
                    {field.helper}
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
