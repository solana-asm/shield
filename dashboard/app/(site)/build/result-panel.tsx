import { cn } from "@/lib/utils";
import type { CompiledMessageView, SimulationResult } from "./actions";

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
            <span className="text-foreground">
              {result.unitsConsumed.toLocaleString()}
            </span>{" "}
            cu consumed
          </span>
          <span>· {result.network}</span>
        </div>
      </div>

      {result.programs.length > 0 && (
        <div className="rounded-md border border-border bg-card">
          <p className="border-b border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            per-guard cu
          </p>
          <ul className="divide-y divide-border font-mono text-[12px]">
            {result.programs.map((p) => (
              <li
                key={p.slug}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <span className="text-foreground">{p.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {p.cu === null ? (
                    <span className="text-muted-foreground/60">no log</span>
                  ) : (
                    <>
                      <span className="text-foreground">
                        {p.cu.toLocaleString()}
                      </span>{" "}
                      cu
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ComposedTransaction compiled={result.compiled} />

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

function ComposedTransaction({ compiled }: { compiled: CompiledMessageView }) {
  const { header, instructions, byteLength, recentBlockhash } = compiled;

  return (
    <details className="rounded-md border border-border bg-card" open>
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
        <span>composed transaction</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="text-foreground">{byteLength}</span> / 1232 bytes
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
        <div className="grid grid-cols-3 gap-3 font-mono text-[11px]">
          <Stat label="signers" value={header.numRequiredSignatures} />
          <Stat label="ro signed" value={header.numReadonlySignedAccounts} />
          <Stat
            label="ro unsigned"
            value={header.numReadonlyUnsignedAccounts}
          />
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            recent blockhash
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-foreground/90">
            {recentBlockhash}
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            instructions ({instructions.length})
          </p>
          <ol className="mt-1.5 flex flex-col gap-1.5 font-mono text-[11px]">
            {instructions.map((ix, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 rounded-sm border border-border bg-secondary px-2.5 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                    [{i}]
                  </span>
                  <span className="text-foreground">{ix.programLabel}</span>
                  <span className="text-muted-foreground">
                    {ix.accountKeyIndexes.length} acct
                    {ix.accountKeyIndexes.length === 1 ? "" : "s"} ·{" "}
                    {ix.dataLen} byte{ix.dataLen === 1 ? "" : "s"}
                  </span>
                </div>
                {ix.accountKeyIndexes.length > 0 && (
                  <p className="pl-7 text-muted-foreground">
                    accts:{" "}
                    <span className="text-foreground/80">
                      {ix.accountKeyIndexes.map((n) => `[${n}]`).join(" ")}
                    </span>
                  </p>
                )}
                {ix.dataLen > 0 && (
                  <p className="break-all pl-7 text-muted-foreground">
                    data:{" "}
                    <span className="text-foreground/80">{ix.dataHex}</span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border bg-secondary px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 tabular-nums text-foreground">{value}</p>
    </div>
  );
}
