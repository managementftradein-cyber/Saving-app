import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) return response;

  if (!user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_verified, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  // email_confirmed_at is a safe fallback because our OTP verification also
  // confirms the underlying Supabase Auth email. It prevents a trigger/profile
  // race from trapping an already verified user on the verification page.
  const verified = profile
    ? profile.email_verified === true
    : Boolean(user.email_confirmed_at);

  if (!verified) {
    const redirectUrl = new URL("/auth/verify", request.url);
    if (user.email) redirectUrl.searchParams.set("email", user.email);
    return NextResponse.redirect(redirectUrl);
  }

  const onboardingComplete = Boolean(profile?.onboarding_completed_at);

  if (pathname.startsWith("/onboarding") && onboardingComplete) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard") && !onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding/profile", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
