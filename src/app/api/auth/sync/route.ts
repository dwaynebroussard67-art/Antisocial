import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { computeAndApplyTier } from "@/lib/tiers/assign-tier";
import { eq, sql } from "drizzle-orm";

/**
 * Called once by the sign-in page right after a successful Supabase
 * sign-in. getViewer() does the member-row linking (including upgrading
 * an anonymous Street identity); this route additionally bumps the
 * sign-in counter and re-affirms tier — assign-tier.ts's "on every
 * sign-in" contract lives here so getViewer stays cheap per-request.
 */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  await db
    .update(members)
    .set({ signInCount: sql`${members.signInCount} + 1`, updatedAt: new Date() })
    .where(eq(members.id, viewer.id));

  const tier = await computeAndApplyTier(viewer.id);
  return NextResponse.json({ ok: true, tier });
}
