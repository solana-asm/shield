import type { ExitCode } from "@/lib/guard-content";
import { cn } from "@/lib/utils";

export function ExitCodesTable({ exits }: { exits: ExitCode[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <table className="w-full font-mono text-sm">
        <caption className="sr-only">Exit codes for this guard</caption>
        <thead>
          <tr className="border-b border-border bg-secondary/30 text-left">
            <Th>code</Th>
            <Th>name</Th>
            <Th>log line</Th>
          </tr>
        </thead>
        <tbody>
          {exits.map((e, i) => (
            <tr
              key={e.code}
              className={cn(
                i !== exits.length - 1 && "border-b border-border"
              )}
            >
              <td className="w-16 px-4 py-3 tabular-nums">
                <span
                  className={cn(
                    "font-semibold",
                    e.code === 0 ? "text-primary" : "text-foreground"
                  )}
                >
                  {e.code}
                </span>
              </td>
              <td className="px-4 py-3 text-foreground">{e.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {e.log ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
    >
      {children}
    </th>
  );
}
