import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GuardHeader } from "@/components/shield/guard-header";
import { CodeBlock } from "@/components/shield/code-block";
import { AssemblyWalkthrough } from "@/components/shield/assembly-walkthrough";
import { AssemblyPrimer } from "@/components/shield/assembly-primer";
import { ExitCodesTable } from "@/components/shield/exit-codes-table";
import { Footer } from "@/components/shield/footer";
import { guards } from "@/lib/guards";
import { guardContent } from "@/lib/guard-content";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return guards.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guard = guards.find((g) => g.slug === slug);
  if (!guard) return { title: "Guard not found" };
  return {
    title: `${guard.name} · Shield`,
    description: guard.oneLiner,
  };
}

export default async function GuardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const guard = guards.find((g) => g.slug === slug);
  const content = guardContent[slug];
  if (!guard || !content) notFound();

  const idx = guards.findIndex((g) => g.slug === slug);
  const prev = idx > 0 ? guards[idx - 1] : null;
  const next = idx >= 0 && idx < guards.length - 1 ? guards[idx + 1] : null;

  return (
    <>
      <GuardHeader guard={guard} />

      <Section title="What it does">
        <div className="flex flex-col gap-4 text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
          {content.description.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>

      <Section title="How to use it">
        <CodeBlock
          code={content.example}
          language="ts"
          ariaLabel={`${guard.name} TypeScript example`}
        />
        {content.exampleNote && (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {content.exampleNote}
          </p>
        )}
      </Section>

      {content.detailed && content.assembly && content.blocks && (
        <Section title="Assembly walkthrough">
          <div className="flex flex-col gap-10">
            <AssemblyPrimer />
            <AssemblyWalkthrough
              assembly={content.assembly}
              blocks={content.blocks}
            />
          </div>
        </Section>
      )}

      <Section title="Exit codes">
        <ExitCodesTable exits={content.exits} />
      </Section>

      <Section title="Source">
        <ul className="flex flex-col gap-2 font-mono text-sm">
          <SourceLink href={content.sourceLinks.assembly} label="assembly · src/.s" />
          <SourceLink href={content.sourceLinks.test} label="integration test" />
          {content.sourceLinks.example && (
            <SourceLink
              href={content.sourceLinks.example}
              label="sdk example"
            />
          )}
        </ul>
      </Section>

      <nav
        aria-label="Guard navigation"
        className="border-t border-border px-6 py-10 sm:px-12"
      >
        <div className="mx-auto flex max-w-3xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          {prev ? (
            <Link
              href={`/guards/${prev.slug}`}
              className="group flex flex-col gap-1 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                ← previous
              </span>
              <span className="font-mono text-sm text-foreground group-hover:text-primary">
                {prev.name}
              </span>
            </Link>
          ) : (
            <span aria-hidden />
          )}
          {next ? (
            <Link
              href={`/guards/${next.slug}`}
              className="group flex flex-col gap-1 rounded-md border border-border bg-card px-4 py-3 text-right transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                next →
              </span>
              <span className="font-mono text-sm text-foreground group-hover:text-primary">
                {next.name}
              </span>
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </div>
      </nav>

      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-6 py-12 sm:px-12 sm:py-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {label}
        <span aria-hidden className="text-muted-foreground group-hover:text-primary">
          ↗
        </span>
      </a>
    </li>
  );
}
