import { cookies } from "next/headers";
import { createSupabaseServerClient } from "./supabase-server";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";
import { computeAndApplyTier } from "@/lib/tiers/assign-tier";
import { isBanned } from "@/lib/moderation/nura";
import { eq } from "drizzle-orm";

/**
 * REAL AUTH — the stub is gone. This is Supabase auth, the same project
 * and the same accounts as Misfit Ministries. One email/password works on
 * both sites.
 *
 * getViewer() resolves the signed-in Supabase user to a `members` row:
 *   1. by auth_user_id (normal case after first sign-in)
 *   2. by matching email (a Ministries account signing in here for the
 *      first time) — links auth_user_id onto that row
 *   3. by the anonymous Street cookie — a Street visitor who signs up
 *      KEEPS their member row, game history, and presence. Their
 *      anonymous identity is upgraded, not replaced.
 *   4. otherwise a fresh member row is created.
 * Whenever a link/create happens (2–4), tier is recomputed once —
 * that's the Street -> Block promotion moment.
 *
 * Anonymous visitors still return null here; Street access never
 * requires sign-in (see anonymous-identity.ts).
 */

const ANON_COOKIE = "antisocial_anon_id";

export type Viewer = {
  id: string;
  email: string | null;
  // Surfaced for the nav + account page (HANDOFF-31). Null until the
  // member sets one on /account; pickers and walls prefer it over email.
  displayName: string | null;
};

/**
 * BAN ENFORCEMENT (D's correction, this session).
 *
 * A Band A verdict removes the person from the site — "the person is kicked
 * off the site with no questions asked, no warnings." This is where that
 * becomes true rather than just recorded: a banned member resolves to no
 * viewer at all, so every tier gate, every route and every page treats them
 * as a signed-out stranger.
 *
 * It sits in the wrapper rather than inside resolveViewer so it covers all
 * four resolution paths (linked, by-email, anonymous-upgrade, brand-new)
 * with one check instead of four that could drift apart. It also means a
 * banned person who makes a NEW account is caught the moment that account
 * links to an existing banned member row.
 *
 * No message, no explanation, no appeal link — by design.
 */
export async function getViewer(): Promise<Viewer | null> {
  const viewer = await resolveViewer();
  if (!viewer) return null;
  if (await isBanned(viewer.id)) return null;
  return viewer;
}

async function resolveViewer(): Promise<Viewer | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Already linked.
  const [linked] = await db
    .select({ id: members.id, email: members.email, displayName: members.displayName })
    .from(members)
    .where(eq(members.authUserId, user.id))
    .limit(1);
  if (linked) return linked;

  const email = user.email ?? null;
  const emailVerifiedAt = user.email_confirmed_at ? new Date(user.email_confirmed_at) : null;

  // 2. Existing member row with this email (e.g. created on the
  // Ministries side or seeded) — attach the auth identity to it.
  if (email) {
    const [byEmail] = await db
      .select({ id: members.id, displayName: members.displayName })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);
    if (byEmail) {
      await db
        .update(members)
        .set({ authUserId: user.id, emailVerifiedAt, updatedAt: new Date() })
        .where(eq(members.id, byEmail.id));
      await ensureRoleRow(byEmail.id);
      await computeAndApplyTier(byEmail.id);
      return { id: byEmail.id, email, displayName: byEmail.displayName };
    }
  }

  // 3. Anonymous Street visitor signing up — upgrade their existing row
  // so nothing they did as a Street visitor is lost.
  const cookieStore = await cookies();
  const anonId = cookieStore.get(ANON_COOKIE)?.value;
  if (anonId) {
    const [anonRow] = await db
      .select({ id: members.id, displayName: members.displayName })
      .from(members)
      .where(eq(members.anonymousDeviceId, anonId))
      .limit(1);
    if (anonRow) {
      await db
        .update(members)
        .set({ authUserId: user.id, email, emailVerifiedAt, updatedAt: new Date() })
        .where(eq(members.id, anonRow.id));
      await ensureRoleRow(anonRow.id);
      await computeAndApplyTier(anonRow.id);
      return { id: anonRow.id, email, displayName: anonRow.displayName };
    }
  }

  // 4. Brand new to both sites' data.
  const [created] = await db
    .insert(members)
    .values({ authUserId: user.id, email, emailVerifiedAt })
    .returning({ id: members.id });
  await ensureRoleRow(created.id);
  await computeAndApplyTier(created.id);
  return { id: created.id, email, displayName: null };
}

async function ensureRoleRow(memberId: string) {
  const [existing] = await db
    .select({ id: memberRoles.id })
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId))
    .limit(1);
  if (!existing) {
    await db.insert(memberRoles).values({ memberId, tier: "street" });
  }
}
