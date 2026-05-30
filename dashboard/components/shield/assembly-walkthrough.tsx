"use client";

import { useEffect, useRef, useState } from "react";
import { CodeBlock } from "./code-block";
import type { AssemblyBlock } from "@/lib/guard-content";
import { SBPF_DOCS, buildSbpfFirstOccurrence } from "@/lib/sbpf-docs";

export function AssemblyWalkthrough({
  assembly,
  blocks,
}: {
  assembly: string;
  blocks: AssemblyBlock[];
}) {
  const allLines = assembly.replace(/\n+$/g, "").split("\n");
  const firstOccurrence = buildSbpfFirstOccurrence(assembly);

  return (
    <div className="flex flex-col gap-14">
      {blocks.map((block, i) => {
        const slice = allLines
          .slice(block.startLine - 1, block.endLine)
          .join("\n");
        const lineLabel =
          block.endLine !== block.startLine
            ? `lines ${block.startLine}-${block.endLine}`
            : `line ${block.startLine}`;
        const newKeywords = Object.entries(firstOccurrence)
          .filter(
            ([, line]) => line >= block.startLine && line <= block.endLine
          )
          .map(([kw]) => kw);
        return (
          <WalkthroughBlock
            key={`${block.startLine}-${block.endLine}`}
            index={i}
            block={block}
            slice={slice}
            lineLabel={lineLabel}
            newKeywords={newKeywords}
          />
        );
      })}
    </div>
  );
}

function WalkthroughBlock({
  index,
  block,
  slice,
  lineLabel,
  newKeywords,
}: {
  index: number;
  block: AssemblyBlock;
  slice: string;
  lineLabel: string;
  newKeywords: string[];
}) {
  const headerRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "0px 0px -40% 0px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <article
      aria-labelledby={`block-${index}-title`}
      className={`relative flex flex-col gap-4 pl-6 transition-all duration-300 sm:pl-7 ${
        active ? "before:bg-primary" : "before:bg-border/60"
      } before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-full before:transition-all`}
    >
      <header ref={headerRef} className="flex flex-col gap-1.5">
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
            active ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {lineLabel}
        </p>
        <h3
          id={`block-${index}-title`}
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {block.title}
        </h3>
      </header>
      <CodeBlock
        code={slice}
        language="sbpf"
        startLine={block.startLine}
        ariaLabel={lineLabel}
      />
      {newKeywords.length > 0 && <NewKeywords keywords={newKeywords} />}
      <div className="flex flex-col gap-3 text-[15px] leading-7 text-muted-foreground">
        {block.commentary.map((p, j) => (
          <p key={j}>{p}</p>
        ))}
      </div>
    </article>
  );
}

function NewKeywords({ keywords }: { keywords: string[] }) {
  return (
    <aside className="rounded-md border border-dashed border-border/70 bg-secondary/40 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        introduced here
      </p>
      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-[max-content_1fr]">
        {keywords.map((kw) => {
          const isDirective = kw.startsWith(".");
          return (
            <div
              key={kw}
              className="contents text-[13px] leading-6 text-muted-foreground"
            >
              <dt
                className={
                  isDirective
                    ? "font-mono italic text-muted-foreground"
                    : "font-mono text-primary"
                }
              >
                {kw}
              </dt>
              <dd>{SBPF_DOCS[kw]}</dd>
            </div>
          );
        })}
      </dl>
    </aside>
  );
}
