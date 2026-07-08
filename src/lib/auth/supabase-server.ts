import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client, scoped to the current request's cookies.
 * This is the SAME Supabase project Misfit Ministries signs into —
 * one account works on both sites. The fallback values exist only so
 * `next build` and local dev don't crash before env vars are set
 * (same pattern that fixed the Ministries black-screen).
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component during render — cookie writes
          // aren't allowed there. Safe to ignore: the middleware is what
          // actually keeps the session token refreshed.
        }
      },
    },
  });
}
