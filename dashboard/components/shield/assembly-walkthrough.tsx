import { CodeBlock } from "./code-block";
import type { AssemblyBlock } from "@/lib/guard-content";

export function AssemblyWalkthrough({
  assembly,
  blocks,
}: {
  assembly: string;
  blocks: AssemblyBlock[];
}) {
  const allLines = assembly.replace(/\n+$/g, "").split("\n");

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
        return (
          <article
            key={`${block.startLine}-${block.endLine}`}
            aria-labelledby={`block-${i}-title`}
            className="flex flex-col gap-4 border-l border-border/60 pl-5 sm:pl-6"
          >
            <header className="flex flex-col gap-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {lineLabel}
              </p>
              <h3
                id={`block-${i}-title`}
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
            <div className="flex flex-col gap-3 text-[15px] leading-7 text-muted-foreground">
              {block.commentary.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
