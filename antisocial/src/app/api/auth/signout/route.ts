import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";

/**
 * POST /api/auth/signout — ends the Supabase session and sends the
 * visitor back to the front door. Their anonymous Street cookie (if any)
 * survives, so they don't vanish — they're just back on the Street.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
