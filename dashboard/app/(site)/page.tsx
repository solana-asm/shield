import { Hero } from "@/components/shield/hero";
import { GuardCard } from "@/components/shield/guard-card";
import { Footer } from "@/components/shield/footer";
import { guards } from "@/lib/guards";

export default function Home() {
  return (
    <>
      <Hero />

      <section
        className="flex-1 border-b border-border px-6 py-16 sm:px-12"
        aria-labelledby="guards-heading"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="flex items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                catalog
              </p>
              <h2
                id="guards-heading"
                className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                Seven guards, each a single instruction prepended to your tx.
              </h2>
            </div>
            <p className="hidden shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground sm:block">
              {guards.length} of 7 live
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guards.map((g) => (
              <li key={g.slug} className="flex">
                <GuardCard guard={g} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </>
  );
}
