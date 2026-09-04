import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require a signed-in, verified user.
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // With Supabase's own "Confirm email" turned off, signUp() returns an
  // active session immediately — so a session alone doesn't mean the user
  // has actually confirmed their email via our own OTP flow. Check the
  // profile flag before letting them past onboarding/dashboard.
  if (isProtected && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email_verified")
      .eq("id", user.id)
      .single();

    if (!profile?.email_verified) {
      const redirectUrl = new URL("/auth/verify", request.url);
      redirectUrl.searchParams.set("email", user.email ?? "");
      redirectUrl.searchParams.set("userId", user.id);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
