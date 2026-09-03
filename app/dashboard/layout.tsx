import BottomNav from "@/components/bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-sm mx-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
