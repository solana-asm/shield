import { cn } from "@/lib/utils";

type Lang = "ts" | "sbpf";

type Props = {
  code: string;
  language?: Lang;
  startLine?: number;
  className?: string;
  ariaLabel?: string;
};

const SBPF_REG = /\b(r0|r1|r2|r3|r4|r5|r6|r7|r8|r9|r10)\b/g;
const SBPF_OPS = /\b(ldxdw|ldxw|ldxh|ldxb|stxdw|stxw|stxh|stxb|lddw|mov64|add64|sub64|mul64|lsh64|jeq|jne|jge|jgt|jlt|jle|ja|call|exit)\b/g;
const SBPF_HEX = /\b(0x[0-9a-fA-F]+)\b/g;
const SBPF_LABEL = /^([a-z_][a-z0-9_]*):/i;

const TS_KEYWORDS =
  /\b(import|from|const|let|var|new|return|if|else|async|await|export|default|type|interface|function|true|false|null)\b/g;
const TS_STRING = /"[^"\n]*"|'[^'\n]*'|`[^`\n]*`/g;
const TS_COMMENT = /(\/\/[^\n]*)/g;
const TS_NUMBER = /\b(\d[\d_]*n?)\b/g;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightSbpf(line: string): string {
  let out = escapeHtml(line);
  out = out.replace(
    SBPF_HEX,
    '<span class="text-muted-foreground">$1</span>'
  );
  out = out.replace(SBPF_OPS, '<span class="text-primary">$1</span>');
  out = out.replace(SBPF_REG, '<span class="text-foreground">$1</span>');
  out = out.replace(SBPF_LABEL, '<span class="text-foreground">$1</span>:');
  return out;
}

function highlightTs(line: string): string {
  let out = escapeHtml(line);
  out = out.replace(TS_COMMENT, '<span class="text-muted-foreground italic">$1</span>');
  out = out.replace(TS_STRING, (m) => `<span class="text-primary">${m}</span>`);
  out = out.replace(TS_KEYWORDS, '<span class="text-foreground font-semibold">$1</span>');
  out = out.replace(TS_NUMBER, '<span class="text-foreground">$1</span>');
  return out;
}

export function CodeBlock({
  code,
  language = "ts",
  startLine = 1,
  className,
  ariaLabel,
}: Props) {
  const lines = code.replace(/\n+$/g, "").split("\n");
  const renderer = language === "sbpf" ? highlightSbpf : highlightTs;
  const padWidth = String(startLine + lines.length - 1).length;

  return (
    <pre
      aria-label={ariaLabel}
      className={cn(
        "overflow-x-auto rounded-md border border-border bg-card font-mono text-[13px] leading-6",
        className
      )}
    >
      <code className="grid">
        {lines.map((line, i) => {
          const lineNumber = startLine + i;
          const html = renderer(line.length === 0 ? " " : line);
          return (
            <span
              key={`${lineNumber}-${i}`}
              className="grid grid-cols-[3rem_1fr] gap-4 px-4 py-0.5"
            >
              <span
                aria-hidden
                className="select-none text-right font-mono text-[11px] text-muted-foreground/60"
                style={{ minWidth: `${padWidth}ch` }}
              >
                {lineNumber}
              </span>
              <span
                className="whitespace-pre text-foreground/90"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </span>
          );
        })}
      </code>
    </pre>
  );
}
