import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";

/**
 * POST /api/auth/signout — ends the Supabase session and sends the
 * visitor back to the front door.
 *
 * GHOST-IDENTITY FIX (HANDOFF-32): the anonymous Street cookie is now
 * DELETED here too. When a Street visitor signs up, their anonymous row
 * is upgraded in place (session.ts case 3) — so after sign-out the old
 * cookie pointed at a Block-tier row with no session behind it, and the
 * landing page said "Continue to the Block" to someone the Block would
 * 403. Clearing it means middleware mints a fresh device id on the next
 * request: the signed-out visitor is a brand-new Street visitor, and
 * everything they built is waiting behind their sign-in, exactly where
 * it should be.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  res.cookies.delete("antisocial_anon_id");
  return res;
}
