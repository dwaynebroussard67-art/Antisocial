import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase auth token refreshed. Without this, a signed-in
 * member's session silently expires after an hour and every tier check
 * quietly demotes them to Street. This middleware never blocks anyone —
 * access decisions stay in requireTierAccess(); this only refreshes.
 *
 * BUGFIX (this session): also assigns the anonymous-visitor device-id
 * cookie here now. It used to be set inside `ensureAnonymousMember()`
 * (src/lib/auth/anonymous-identity.ts), which is called directly from
 * `AntisocialGate`, an async Server Component (src/app/page.tsx). Next.js
 * only allows writing cookies from a Server Action or Route Handler —
 * calling `.set()` during a Server Component render throws "Cookies can
 * only be modified in a Server Action or Route Handler." That meant every
 * brand-new visitor's very first page load crashed. Assigning the cookie
 * here (middleware is allowed to write cookies) and having
 * `ensureAnonymousMember()` only read it fixes that — see the comment in
 * that file for the other half.
 */
const ANON_COOKIE = "antisocial_anon_id";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Assign the anonymous device-id cookie first, so it's visible to both
  // the Supabase step below (session.ts reads it) and the page render.
  let anonIdToPersist: string | null = null;
  if (!request.cookies.get(ANON_COOKIE)?.value) {
    anonIdToPersist = crypto.randomUUID();
    request.cookies.set(ANON_COOKIE, anonIdToPersist);
  }

  // Env vars not set yet (local dev before configuration) — pass through
  // rather than crash every request.
  if (!url || !anonKey) {
    const response = NextResponse.next({ request });
    if (anonIdToPersist) {
      response.cookies.set(ANON_COOKIE, anonIdToPersist, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365 * 2, // 2 years — Street identity should persist
        path: "/",
      });
    }
    return response;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // This call is what triggers the token refresh when needed.
  await supabase.auth.getUser();

  // Apply the anon-id cookie last, on whichever response object Supabase's
  // setAll ended up producing (it may have reassigned `response` above).
  if (anonIdToPersist) {
    response.cookies.set(ANON_COOKIE, anonIdToPersist, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 2,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
