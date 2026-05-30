import { externalLinks } from "@/lib/guards";

export function Hero() {
  return (
    <section className="border-b border-border px-6 py-20 sm:px-12 sm:py-28">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          live on mainnet
          <span className="mx-2 text-border" aria-hidden>
            /
          </span>
          <span className="text-muted-foreground">7 guards</span>
          <span className="mx-2 text-border" aria-hidden>
            /
          </span>
          <span className="text-muted-foreground">under 200 CU each</span>
        </p>

        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          The world moves between sign and land.
        </h1>

        <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
          You signed a Solana transaction ten seconds ago. The price moved, the
          slot is stale, your balance is gone, someone slid in front of you.
          Shield is seven sBPF assembly programs you prepend to a transaction so
          it aborts atomically the instant any of those conditions is true,
          before the swap or the transfer or the call ever runs.
        </p>

        <div className="mt-2 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 font-mono text-sm text-foreground">
            <span className="truncate">
              <span className="text-muted-foreground" aria-hidden>
                $&nbsp;
              </span>
              npm install @solana-asm/shield
            </span>
            <span
              className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              aria-hidden
            >
              v0.5.0
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={externalLinks.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-secondary px-5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              View source
              <span aria-hidden>↗</span>
            </a>
            <a
              href={externalLinks.npm}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              npm package
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
