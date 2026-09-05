import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client used in Server Components, Route Handlers, and Server Actions.
// Handles reading/writing the auth cookie so sessions persist across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // Called from a Server Component — middleware handles refresh instead.
          }
        },
      },
      global: {
        // Prevents Next.js's fetch cache from silently serving stale reads
        // on tables that change frequently (profiles.email_verified, etc).
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
