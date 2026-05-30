"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable; surface nothing
        }
      }}
      aria-label={copied ? "Copied" : `${label} ${value}`}
      className={cn(
        "inline-flex h-8 min-w-[3.5rem] items-center justify-center rounded-sm border border-border bg-secondary px-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors",
        "hover:border-primary hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      {copied ? "copied" : label.toLowerCase()}
    </button>
  );
}
