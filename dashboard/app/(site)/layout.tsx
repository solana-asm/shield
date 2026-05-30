import { Sidebar } from "@/components/shield/sidebar";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full">
      <Sidebar className="hidden w-72 shrink-0 md:flex" />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
