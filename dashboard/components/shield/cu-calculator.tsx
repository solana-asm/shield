"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { cuModels } from "@/lib/cu-models";

export type CuAxis = {
  id: string;
  label: string;
  initial: number;
  min: number;
  max: number;
};

export type CuComputeResult = {
  best: number;
  worst?: number;
  bestSub?: string;
  worstSub?: string;
};

export type CuModel = {
  axes: CuAxis[];
  compute: (values: Record<string, number>) => CuComputeResult;
  txModel?: string;
  footnote: string;
};

export function CuCalculator({ slug }: { slug: string }) {
  const model = cuModels[slug];
  if (!model) return null;
  const { axes, compute, txModel, footnote } = model;

  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(axes.map((a) => [a.id, a.initial]))
  );

  const result = compute(values);
  const hasWorst = result.worst !== undefined;

  function bump(id: string, delta: number) {
    const axis = axes.find((a) => a.id === id);
    if (!axis) return;
    setValues((prev) => ({
      ...prev,
      [id]: Math.max(axis.min, Math.min(axis.max, prev[id] + delta)),
    }));
  }

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

      <div className="flex flex-col gap-6 px-5 py-6">
        <div
          className={cn(
            "grid gap-6",
            axes.length === 1 ? "sm:grid-cols-1" : "sm:grid-cols-2"
          )}
        >
          {axes.map((a) => (
            <AxisInput
              key={a.id}
              axis={a}
              value={values[a.id]}
              onDec={() => bump(a.id, -1)}
              onInc={() => bump(a.id, 1)}
            />
          ))}
        </div>

        <div
          className={cn(
            "grid gap-4",
            hasWorst ? "sm:grid-cols-2" : "sm:grid-cols-1"
          )}
        >
          <Stat
            label={hasWorst ? "best case" : "predicted"}
            value={result.best}
            sub={result.bestSub}
          />
          {hasWorst && (
            <Stat label="worst case" value={result.worst!} sub={result.worstSub} />
          )}
        </div>
      </div>

      <p className="border-t border-border px-5 py-3 text-xs leading-5 text-muted-foreground">
        {footnote}
      </p>
    </div>
  );
}

function AxisInput({
  axis,
  value,
  onDec,
  onInc,
}: {
  axis: CuAxis;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={axis.id}
        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        {axis.label}
      </label>
      <div className="flex items-center gap-2">
        <StepButton
          onClick={onDec}
          disabled={value <= axis.min}
          ariaLabel={`Decrease ${axis.label}`}
        >
          −
        </StepButton>
        <div
          id={axis.id}
          aria-live="polite"
          className="flex h-9 min-w-[3.5rem] items-center justify-center rounded-sm border border-border bg-background px-3 font-mono text-base tabular-nums text-foreground"
        >
          {value}
        </div>
        <StepButton
          onClick={onInc}
          disabled={value >= axis.max}
          ariaLabel={`Increase ${axis.label}`}
        >
          +
        </StepButton>
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        range {axis.min}..{axis.max}
      </span>
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
  sub?: string;
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
      {sub && (
        <span className="text-[11px] leading-4 text-muted-foreground">{sub}</span>
      )}
    </div>
  );
}
