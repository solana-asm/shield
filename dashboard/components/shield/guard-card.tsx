import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Guard } from "@/lib/guards";

export function GuardCard({ guard }: { guard: Guard }) {
  return (
    <Link
      href={`/guards/${guard.slug}`}
      className={cn(
        "group relative flex h-full flex-col gap-5 rounded-md border border-border bg-card p-5",
        "transition-colors hover:border-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-mono text-[15px] font-semibold leading-tight tracking-tight text-foreground">
          {guard.name}
        </h3>
        <span
          className="inline-flex shrink-0 items-baseline gap-1 rounded-sm border border-border px-2 py-1 font-mono text-[11px] tabular-nums text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary"
          aria-label={`${guard.cu} compute units, ${guard.cuNote}`}
        >
          <span className="text-[13px] text-foreground group-hover:text-primary">
            {guard.cu}
          </span>
          <span className="text-[10px] uppercase tracking-widest">cu</span>
        </span>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">
        {guard.oneLiner}
      </p>

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
        <Row label="accts" value={guard.accounts} />
        <Row label="ix" value={guard.ixData} />
        <Row label="exit 1" value={guard.conditionFailed} />
      </div>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-12 shrink-0 uppercase tracking-widest text-[10px]">
        {label}
      </span>
      <span className="truncate text-foreground/80">{value}</span>
    </div>
  );
}
