import { externalLinks } from "@/lib/guards";

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10 sm:px-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-sm font-semibold text-foreground">
          shield.sbpf.dev
        </p>
        <ul className="flex items-center gap-5 font-mono text-xs text-muted-foreground">
          <li>
            <a
              href={externalLinks.npm}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              npm <span aria-hidden>↗</span>
            </a>
          </li>
          <li>
            <a
              href={externalLinks.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              github <span aria-hidden>↗</span>
            </a>
          </li>
          <li>
            <a
              href={externalLinks.book}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              book <span aria-hidden>↗</span>
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
