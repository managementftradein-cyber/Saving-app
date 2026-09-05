import Link from "next/link";

export default function SplashPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-navy via-blue-deep to-blue px-8 text-center text-white">
      <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-5">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
          <path d="M12 2C7 6 4 9 4 13a8 8 0 0016 0c0-4-3-7-8-11z" />
          <path d="M9 13a3 3 0 003 3" />
        </svg>
      </div>
      <h1 className="font-display font-extrabold text-2xl">Nestegg</h1>
      <p className="text-sm opacity-80 mt-2 max-w-xs leading-relaxed">
        Save toward what matters, and grow it together with a community
        that&apos;s doing the same.
      </p>
      <div className="w-full max-w-xs flex flex-col gap-3 mt-9">
        <Link
          href="/auth/signup"
          className="bg-white text-blue-deep font-semibold rounded-2xl py-3.5 px-6 text-sm"
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
    </main>
  );
}
