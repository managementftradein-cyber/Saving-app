import Link from "next/link";

const FEATURES = [
  {
    title: "Save on autopilot",
    body: "Set a goal, choose how often to save, and let auto-save handle the rest — daily, weekly, or monthly.",
    icon: (
      <path d="M12 2C7 6 4 9 4 13a8 8 0 0016 0c0-4-3-7-8-11z" />
    ),
  },
  {
    title: "Real bank withdrawals",
    body: "When you need it, it's yours — withdraw straight to a verified Nigerian bank account in minutes.",
    icon: (
      <>
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <path d="M3 8l9-5 9 5" />
      </>
    ),
  },
  {
    title: "A community that shows up",
    body: "Join savings challenges, compare progress on a weekly leaderboard, and stay accountable together.",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </>
    ),
  },
];

export default function SplashPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-navy via-blue-deep to-blue text-white">
      <div className="max-w-6xl mx-auto min-h-screen flex flex-col lg:flex-row lg:items-center gap-10 px-6 lg:px-12 py-12 lg:py-0">
        {/* Marketing column — only shown at desktop widths */}
        <div className="hidden lg:flex flex-col justify-center flex-1 max-w-lg">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
              <path d="M12 2C7 6 4 9 4 13a8 8 0 0016 0c0-4-3-7-8-11z" />
              <path d="M9 13a3 3 0 003 3" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-4xl leading-tight">
            Savings that actually stick — with people cheering you on.
          </h1>
          <p className="text-white/75 mt-4 text-[15px] leading-relaxed max-w-md">
            Nestegg turns saving into a habit instead of a hope. Automate it,
            track it, and share the win with a community built around the
            same goal: getting there.
          </p>

          <div className="mt-10 flex flex-col gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    {f.icon}
                  </svg>
                </div>
                <div>
                  <p className="font-display font-bold text-[15px]">{f.title}</p>
                  <p className="text-white/70 text-[13px] mt-1 leading-relaxed max-w-sm">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA card — the whole page on mobile, a side panel on desktop */}
        <div className="w-full lg:max-w-sm mx-auto lg:mx-0 flex flex-col items-center text-center lg:bg-white/8 lg:backdrop-blur lg:rounded-[28px] lg:border lg:border-white/10 lg:p-10 py-10">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-5 lg:hidden">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
              <path d="M12 2C7 6 4 9 4 13a8 8 0 0016 0c0-4-3-7-8-11z" />
              <path d="M9 13a3 3 0 003 3" />
            </svg>
          </div>
          <h1 className="font-display font-extrabold text-2xl lg:hidden">Nestegg</h1>
          <p className="text-sm opacity-80 mt-2 max-w-xs leading-relaxed lg:hidden">
            Save toward what matters, and grow it together with a community
            that&apos;s doing the same.
          </p>
          <p className="hidden lg:block font-display font-extrabold text-lg">
            Get started
          </p>
          <p className="hidden lg:block text-white/70 text-[13px] mt-1.5">
            Takes about a minute, most of it is choosing your first goal.
          </p>

          <div className="w-full max-w-xs flex flex-col gap-3 mt-9">
            <Link
              href="/auth/signup"
              className="bg-surface text-blue-deep font-semibold rounded-2xl py-3.5 px-6 text-sm"
            >
              Sign up
            </Link>
            <Link
              href="/auth/login"
              className="border border-white/50 rounded-2xl py-3.5 px-6 text-sm font-semibold"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
