"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, JSX.Element> = {
  home: (
    <>
      <path d="M12 2C7 6 4 9 4 13a8 8 0 0016 0c0-4-3-7-8-11z" />
      <path d="M9 13a3 3 0 003 3" />
    </>
  ),
  savings: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 12h3" />
    </>
  ),
  community: (
    <>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0116 0v1" />
    </>
  ),
};

const TABS = [
  { href: "/dashboard", label: "Home", key: "home" },
  { href: "/dashboard/savings", label: "Savings", key: "savings" },
  { href: "/dashboard/wallet", label: "Wallet", key: "wallet" },
  { href: "/dashboard/community", label: "Community", key: "community" },
  { href: "/dashboard/profile", label: "Profile", key: "profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line">
      <div className="max-w-sm mx-auto flex items-center justify-around h-[72px] pb-1">
        {TABS.map((tab) => {
          const active =
            tab.key === "home"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex flex-col items-center gap-1 text-[10.5px] font-semibold ${
                active ? "text-blue-deep" : "text-ink-soft"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 2.3 : 1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ICONS[tab.key]}
              </svg>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
