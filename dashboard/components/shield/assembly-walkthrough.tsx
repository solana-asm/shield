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
    <div className="flex flex-col gap-12">
      {blocks.map((block, i) => {
        const slice = allLines
          .slice(block.startLine - 1, block.endLine)
          .join("\n");
        return (
          <article
            key={`${block.startLine}-${block.endLine}`}
            className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10"
            aria-labelledby={`block-${i}-title`}
          >
            <div className="lg:col-span-7">
              <CodeBlock
                code={slice}
                language="sbpf"
                startLine={block.startLine}
                ariaLabel={`Lines ${block.startLine} to ${block.endLine}`}
              />
            </div>
            <div className="flex flex-col gap-3 lg:col-span-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                lines {block.startLine}
                {block.endLine !== block.startLine ? `–${block.endLine}` : ""}
              </p>
              <h3
                id={`block-${i}-title`}
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {block.title}
              </h3>
              <div className="flex flex-col gap-3 text-[15px] leading-7 text-muted-foreground">
                {block.commentary.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
