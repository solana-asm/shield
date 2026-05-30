import Link from "next/link";
import type { Guard } from "@/lib/guards";
import { CopyButton } from "./copy-button";

export function GuardHeader({ guard }: { guard: Guard }) {
  return (
    <header className="border-b border-border px-6 py-12 sm:px-12 sm:py-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <nav aria-label="Breadcrumb" className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Link
            href="/"
            className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            guards
          </Link>
          <span aria-hidden className="mx-2 text-border">
            /
          </span>
          <span className="text-foreground">{guard.name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {guard.name}
          </h1>
          <span
            className="inline-flex items-baseline gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-mono text-[12px] tabular-nums text-foreground"
            aria-label={`${guard.cu} compute units, ${guard.cuNote}`}
          >
            <span className="text-primary">{guard.cu}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              cu · {guard.cuNote}
            </span>
          </span>
        </div>

        <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
          {guard.oneLiner}
        </p>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            program id
          </span>
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-primary" title={guard.programId}>
            {guard.programId}
          </code>
          <CopyButton value={guard.programId} label="Copy" />
        </div>
      </div>
    </header>
  );
}
