"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type AllowlistCuModel = {
  baseCu: number;
  slopePerEntry: number;
  maxN?: number;
  txModel?: string;
  bestCaseSub: string;
  worstCaseSub: string;
  footnote: string;
  inputLabel?: string;
  inputId?: string;
};

export function AllowlistCuCalculator(props: AllowlistCuModel) {
  const {
    baseCu,
    slopePerEntry,
    maxN = 20,
    txModel,
    bestCaseSub,
    worstCaseSub,
    footnote,
    inputLabel = "allowlist size (N)",
    inputId = "allowlist-n",
  } = props;

  const [n, setN] = useState(1);

  const best = baseCu;
  const worst = baseCu + (n - 1) * slopePerEntry;

  const dec = () => setN((v) => Math.max(1, v - 1));
  const inc = () => setN((v) => Math.min(maxN, v + 1));

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          cu calculator
        </span>
        {txModel && (
          <span className="font-mono text-[11px] text-muted-foreground">
            tx model{": "}
            <span className="text-foreground">{txModel}</span>
          </span>
        )}
      </div>

      <div className="grid gap-6 px-5 py-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
        <div className="flex flex-col gap-3">
          <label
            htmlFor={inputId}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {inputLabel}
          </label>
          <div className="flex items-center gap-2">
            <StepButton
              onClick={dec}
              disabled={n <= 1}
              ariaLabel="Decrease allowlist size"
            >
              −
            </StepButton>
            <div
              id={inputId}
              aria-live="polite"
              className="flex h-9 min-w-[3.5rem] items-center justify-center rounded-sm border border-border bg-background px-3 font-mono text-base tabular-nums text-foreground"
            >
              {n}
            </div>
            <StepButton
              onClick={inc}
              disabled={n >= maxN}
              ariaLabel="Increase allowlist size"
            >
              +
            </StepButton>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            range 1..{maxN}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="best case" value={best} sub={bestCaseSub} />
          <Stat label="worst case" value={worst} sub={worstCaseSub} />
        </div>
      </div>

      <p className="border-t border-border px-5 py-3 text-xs leading-5 text-muted-foreground">
        {footnote}
      </p>
    </div>
  );
}

function StepButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-secondary font-mono text-base text-foreground transition-colors",
        "hover:border-primary hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-2xl tabular-nums text-primary">
        {value}
        <span className="ml-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          cu
        </span>
      </span>
      <span className="text-[11px] leading-4 text-muted-foreground">{sub}</span>
    </div>
  );
}
