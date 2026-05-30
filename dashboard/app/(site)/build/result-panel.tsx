import { cn } from "@/lib/utils";
import type { SimulationResult } from "./actions";

const FAILURE_LOG = /^Program log: (.+)$/;
const PROGRAM_FAILED = /^Program (\w+) failed: (.+)$/;

export function ResultPanel({ result }: { result: SimulationResult | null }) {
  if (!result) {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ready
        </p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Select guards, fill in params, hit Simulate. The shielded transaction
          runs against the chosen network and the result lands here.
        </p>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-destructive/60 bg-card p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
          builder error
        </p>
        <p className="font-mono text-sm text-foreground">{result.message}</p>
        <p className="text-sm text-muted-foreground">
          This is a client-side build failure (bad input, network unreachable),
          not an on-chain abort. Fix the inputs and try again.
        </p>
      </div>
    );
  }

  const aborted = result.failedAt !== null;
  const failureLine = aborted
    ? result.logs.find((l) => PROGRAM_FAILED.test(l))
    : null;
  const failureLogLine = aborted
    ? [...result.logs].reverse().find((l) => FAILURE_LOG.test(l))
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3",
          aborted ? "border-destructive/60" : "border-primary/60"
        )}
      >
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.18em]",
              aborted ? "text-destructive" : "text-primary"
            )}
          >
            {aborted ? `aborted at ix ${result.failedAt}` : "all guards passed"}
          </p>
          {failureLogLine && (
            <p className="font-mono text-sm text-foreground">
              {failureLogLine.replace(/^Program log: /, "")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
          <span>
            <span className="text-foreground">{result.unitsConsumed}</span> cu
            consumed
          </span>
          <span>· {result.network}</span>
        </div>
      </div>

      {result.programs.length > 0 && (
        <ul className="flex flex-wrap gap-2 font-mono text-[11px]">
          {result.programs.map((p) => (
            <li
              key={p.slug}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1 text-muted-foreground"
            >
              <span className="text-foreground">{p.name}</span>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-md border border-border bg-card">
        <summary className="cursor-pointer select-none px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
          full simulation logs ({result.logs.length})
        </summary>
        <pre className="overflow-x-auto border-t border-border px-4 py-4 font-mono text-[12px] leading-6">
          <code className="block">
            {result.logs.length === 0 ? (
              <span className="text-muted-foreground">no logs returned</span>
            ) : (
              result.logs.map((line, i) => {
                const isFailureLine = line === failureLine;
                const isProgramLog = FAILURE_LOG.test(line);
                return (
                  <div
                    key={i}
                    className={cn(
                      "whitespace-pre",
                      isFailureLine && "text-destructive",
                      !isFailureLine && isProgramLog && "text-primary",
                      !isFailureLine && !isProgramLog && "text-foreground/80"
                    )}
                  >
                    {line}
                  </div>
                );
              })
            )}
          </code>
        </pre>
      </details>
    </div>
  );
}
