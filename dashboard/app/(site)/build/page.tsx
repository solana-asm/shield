import type { Metadata } from "next";
import { Footer } from "@/components/shield/footer";
import { Builder } from "./builder";

export const metadata: Metadata = {
  title: "Build a shielded transaction · Shield",
  description:
    "Compose Shield guards into a single transaction, simulate it against devnet or mainnet, and see the abort log when a guard rejects.",
};

export default function BuildPage() {
  return (
    <>
      <header className="border-b border-border px-6 py-12 sm:px-12 sm:py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            build
            <span className="mx-2 text-border" aria-hidden>
              /
            </span>
            <span className="text-muted-foreground">simulate, no wallet, no real SOL</span>
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Compose a shielded transaction.
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
            Pick the guards you want, fill in their params, choose devnet or
            mainnet. The page calls{" "}
            <code className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[13px] text-foreground">
              @solana-asm/shield
            </code>{" "}
            from npm to compose the prefix, runs{" "}
            <code className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[13px] text-foreground">
              simulateTransaction
            </code>{" "}
            against the chosen RPC, and renders the result below. No wallet
            connect, no signature, no SOL spent. If a guard rejects, you see the
            abort log.
          </p>
        </div>
      </header>

      <section className="border-b border-border px-6 py-12 sm:px-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <Builder />
        </div>
      </section>

      <Footer />
    </>
  );
}
