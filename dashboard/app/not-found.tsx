import type { Metadata } from "next";
import Link from "next/link";
import { externalLinks } from "@/lib/guards";

export const metadata: Metadata = {
  title: "Page not found · Shield",
  description: "The page you're looking for doesn't exist on Shield.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 sm:px-12 sm:py-28">
      <div className="flex w-full max-w-xl flex-col gap-8 text-center">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary"
          aria-hidden
        >
          404
          <span className="mx-2 text-border">/</span>
          <span className="text-muted-foreground">not found</span>
        </p>

        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          This route does not exist.
        </h1>

        <p className="text-pretty text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-8">
          The link may be broken, the page may have moved, or the slug may
          never have shipped. Head back to the catalog or jump to the source.
        </p>

        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto"
          >
            Back to home
          </Link>
          <a
            href={externalLinks.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto"
          >
            View source
            <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </main>
  );
}
