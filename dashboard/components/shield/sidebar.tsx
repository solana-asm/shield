"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { guards, externalLinks, shieldSdkVersion } from "@/lib/guards";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const isBuildActive = pathname === "/build";

  return (
    <aside
      className={cn(
        "flex flex-col gap-8 border-r border-border bg-card/30 px-6 py-8",
        className
      )}
      aria-label="Shield navigation"
    >
      <Link href="/" className="group inline-flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-primary"
        />
        <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
          shield
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          sbpf.dev
        </span>
      </Link>

      <nav aria-label="Try it" className="flex flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Try
        </p>
        <ul className="flex flex-col">
          <li>
            <Link
              href="/build"
              aria-current={isBuildActive ? "page" : undefined}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-md px-2 py-2",
                "text-sm font-medium transition-colors",
                "hover:bg-secondary hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isBuildActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <span>build a shielded tx</span>
              <span
                aria-hidden
                className={cn(
                  "font-mono text-[11px] transition-colors group-hover:text-primary",
                  isBuildActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                →
              </span>
            </Link>
          </li>
        </ul>
      </nav>

      <nav aria-label="Guards" className="flex flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Guards
        </p>
        <ul className="flex flex-col">
          {guards.map((g) => {
            const isActive = pathname === `/guards/${g.slug}`;
            return (
              <li key={g.slug}>
                <Link
                  href={`/guards/${g.slug}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-md px-2 py-2",
                    "text-sm font-medium transition-colors",
                    "hover:bg-secondary hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <span className="font-mono">{g.name}</span>
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums transition-colors group-hover:text-primary",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {g.cu}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-label="Resources" className="flex flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Resources
        </p>
        <ul className="flex flex-col">
          <ResourceLink href={externalLinks.npm} label="npm package" />
          <ResourceLink href={externalLinks.github} label="github repo" />
          <ResourceLink href={externalLinks.book} label="sbpf book" />
        </ul>
      </nav>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
        <span>{shieldSdkVersion}</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          mainnet
        </span>
      </div>
    </aside>
  );
}

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group flex items-center justify-between gap-3 rounded-md px-2 py-2",
          "text-sm font-medium text-muted-foreground transition-colors",
          "hover:bg-secondary hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
      >
        <span>{label}</span>
        <span
          aria-hidden
          className="font-mono text-[11px] text-muted-foreground group-hover:text-primary"
        >
          ↗
        </span>
      </a>
    </li>
  );
}
