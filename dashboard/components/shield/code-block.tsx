"use client";

import { useState } from "react";
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
const SBPF_DIRECTIVE = /(\.equ|\.globl|\.rodata|\.ascii|\.byte)\b/g;
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
  out = out.replace(SBPF_HEX, '<span class="text-muted-foreground">$1</span>');
  out = out.replace(SBPF_OPS, '<span class="text-primary">$1</span>');
  out = out.replace(SBPF_DIRECTIVE, '<span class="text-muted-foreground italic">$1</span>');
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

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API blocked, no-op
    }
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-md border border-border bg-card",
        className
      )}
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-md border border-border/60 bg-card/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground opacity-0 backdrop-blur transition-all hover:border-primary hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100"
      >
        {copied ? (
          <>
            <CheckIcon />
            <span>copied</span>
          </>
        ) : (
          <>
            <CopyIcon />
            <span>copy</span>
          </>
        )}
      </button>
      <pre
        aria-label={ariaLabel}
        className="overflow-x-auto font-mono text-[13px] leading-6"
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
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
