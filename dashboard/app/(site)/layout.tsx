import { Sidebar } from "@/components/shield/sidebar";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh w-full overflow-hidden">
      <Sidebar className="hidden h-svh w-72 shrink-0 overflow-y-auto overscroll-contain md:flex" />
      <main className="flex h-svh flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </main>
    </div>
  );
}
