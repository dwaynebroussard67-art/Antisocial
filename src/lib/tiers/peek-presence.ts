import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";
import { memberPresence } from "@/lib/db/schema/notifications";
import { and, eq, gt, desc } from "drizzle-orm";
import type { MemberTier } from "@/lib/auth/roles";
import { tierAbove, tierVisibility } from "./visibility";

/**
 * PRESENCE BOARDS, INCLUDING THE ONE-LEVEL-UP PEEK.
 *
 * "They can see that these people are active... but that's the limit of
 * their interaction. They are able to observe that those people are present."
 *
 * The shape of what comes back is the enforcement. A peek row carries a
 * display name and whether the person is active — and no member id. That's
 * deliberate: without an id the client physically cannot construct a DM,
 * a challenge, a mention, or a cheer against an upstairs member, so the
 * "can't disturb them" rule can't be lost to a future component that gets
 * handed this data and assumes an id means it may act on it.
 *
 * Same-tier and downward boards DO carry ids, because interaction there is
 * permitted and features need to address people.
 */

// How fresh lastSeenAt must be to count as "active now". Matches the 60s
// client heartbeat with room for one missed beat.
const ACTIVE_WINDOW_MS = 3 * 60 * 1000;

/** Upstairs: no id. You can see them; you cannot touch them. */
export type PeekPresenceRow = {
  displayName: string;
  active: boolean;
};

/** Own tier and below: addressable, because interaction is allowed. */
export type ReachablePresenceRow = PeekPresenceRow & {
  memberId: string;
  tier: MemberTier;
};

function displayNameFor(row: { displayName: string | null; email: string | null }): string {
  return row.displayName ?? row.email?.split("@")[0] ?? "Someone";
}

/**
 * The tier directly above the viewer, presence only. Returns null when the
 * viewer is in the Pit — there is nothing above the Pit to peek at.
 *
 * Sorted by active-first then name so the board reads as "who's here now"
 * rather than a membership roster.
 */
export async function getUpstairsPresence(
  viewerTier: MemberTier
): Promise<{ tier: MemberTier; rows: PeekPresenceRow[] } | null> {
  const upstairs = tierAbove(viewerTier);
  if (!upstairs) return null;

  // Belt and braces: this should always be presence_only by construction,
  // but if tierVisibility's rules are ever changed this refuses to leak
  // rather than silently widening the peek.
  if (tierVisibility(viewerTier, upstairs) !== "presence_only") return null;

  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const rows = await db
    .select({
      displayName: members.displayName,
      email: members.email,
      lastSeenAt: memberPresence.lastSeenAt,
    })
    .from(memberRoles)
    .innerJoin(members, eq(members.id, memberRoles.memberId))
    .leftJoin(memberPresence, eq(memberPresence.memberId, memberRoles.memberId))
    .where(eq(memberRoles.tier, upstairs))
    .orderBy(desc(memberPresence.lastSeenAt))
    .limit(100);

  return {
    tier: upstairs,
    rows: rows.map((r) => ({
      displayName: displayNameFor(r),
      active: Boolean(r.lastSeenAt && r.lastSeenAt > cutoff),
    })),
  };
}

/**
 * Who's active at the viewer's own tier or below — the people they may
 * actually talk to. Ids included; interaction against these is permitted
 * by the ladder (still subject to per-feature rules like room membership).
 */
export async function getReachablePresence(
  viewerTier: MemberTier,
  opts: { activeOnly?: boolean; limit?: number } = {}
): Promise<ReachablePresenceRow[]> {
  const { activeOnly = true, limit = 100 } = opts;
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const conditions = [];
  if (activeOnly) conditions.push(gt(memberPresence.lastSeenAt, cutoff));

  const rows = await db
    .select({
      memberId: memberRoles.memberId,
      tier: memberRoles.tier,
      displayName: members.displayName,
      email: members.email,
      lastSeenAt: memberPresence.lastSeenAt,
    })
    .from(memberRoles)
    .innerJoin(members, eq(members.id, memberRoles.memberId))
    .innerJoin(memberPresence, eq(memberPresence.memberId, memberRoles.memberId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(memberPresence.lastSeenAt))
    .limit(limit * 2); // over-fetch, then filter by ladder below

  // Filter in application code rather than SQL: the ladder rule lives in
  // visibility.ts and must not be duplicated as a hand-written tier list in
  // a WHERE clause that would drift the next time a tier is added.
  return rows
    .filter((r) => tierVisibility(viewerTier, r.tier) === "full")
    .slice(0, limit)
    .map((r) => ({
      memberId: r.memberId,
      tier: r.tier,
      displayName: displayNameFor(r),
      active: Boolean(r.lastSeenAt && r.lastSeenAt > cutoff),
    }));
}
