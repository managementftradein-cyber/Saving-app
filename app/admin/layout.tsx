import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sky-soft">
      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-extrabold text-lg text-navy">
            Nestegg Admin
          </h1>
          <nav className="flex gap-4 text-xs font-bold text-blue-deep">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/community">Community</Link>
            <Link href="/dashboard" className="text-ink-soft">
              ← Exit
            </Link>
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}
