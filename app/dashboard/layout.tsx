import BottomNav from "@/components/bottom-nav";
import AppShell from "@/components/app-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="min-h-screen pb-20">
        <div className="max-w-sm mx-auto">{children}</div>
        <BottomNav />
      </div>
    </AppShell>
  );
}
