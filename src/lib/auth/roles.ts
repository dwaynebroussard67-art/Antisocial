import { getViewer } from "./session"; // see session.ts — the piece that needs a real auth provider wired in
import { db } from "@/lib/db";
import { memberRoles } from "@/lib/db/schema/member-roles";
import { eq } from "drizzle-orm";

export type MemberTier = "street" | "block" | "crib" | "pit";

// Rank encodes the cascade: anyone at rank N can see every tier at rank <= N.
// Street is the ONLY tier that is boxed in — nothing cascades down to it.
const TIER_RANK: Record<MemberTier, number> = {
  street: 0,
  block: 1,
  crib: 2,
  pit: 3,
};

const ROLE_RANK = { member: 0, moderator: 1, admin: 2 } as const;

export class AccessDeniedError extends Error {
  constructor(
    public reason: "unauthenticated" | "insufficient_tier" | "insufficient_role",
    message: string
  ) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export async function getMemberTier(memberId: string): Promise<MemberTier> {
  const [row] = await db
    .select({ tier: memberRoles.tier })
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId))
    .limit(1);

  // No row yet == brand new anonymous visitor. Default to Street — this is
  // the one place the old code's "default to block" logic had to change,
  // since Street is now explicitly reachable without any credentials at all.
  return row?.tier ?? "street";
}

/**
 * The single function every page/route should call to check tier access.
 * `requiredTier` is the FLOOR — a viewer at or above it (per the cascade)
 * passes. This is what makes "Crib access sees Crib + everything under it"
 * a one-line check instead of a special case per page.
 */
export async function requireTierAccess(requiredTier: MemberTier) {
  const viewer = await getViewer(); // null is fine here — Street doesn't require sign-in

  if (viewer) {
    const [row] = await db
      .select({ tier: memberRoles.tier, siteRole: memberRoles.siteRole })
      .from(memberRoles)
      .where(eq(memberRoles.memberId, viewer.id))
      .limit(1);
    const tier = row?.tier ?? "street";

    const isAdmin = row?.siteRole === "admin";

    // ADMIN OVERRIDE (HANDOFF-33): D runs this place — site_role admin
    // passes every tier gate regardless of earned tier. The returned tier
    // is lifted to the floor being entered so the page itself renders
    // correctly. The earned tier in the database is NOT changed: admin is
    // oversight, not a shortcut on the ladder. (Note requireActiveResponder
    // still gates Narcan Watch separately — being admin does not make
    // anyone an on-call responder.)
    //
    // isAdmin is returned SEPARATELY from tier (HANDOFF-35 fix) because
    // "tier" here is only ever lifted to the FLOOR of the page you're
    // currently on — it is not "admin's true ceiling." NavBar needs the
    // real isAdmin flag to know every door is open, regardless of which
    // page happens to be rendering it right now. Passing the lifted
    // per-page `tier` alone made every tier above the current page look
    // locked in the nav (only /pit ever looked fully unlocked).
    if (isAdmin && TIER_RANK[tier] < TIER_RANK[requiredTier]) {
      return { viewer, tier: requiredTier, isAdmin };
    }

    if (TIER_RANK[tier] < TIER_RANK[requiredTier]) {
      throw new AccessDeniedError(
        "insufficient_tier",
        `${requiredTier} access required, viewer is ${tier}.`
      );
    }
    return { viewer, tier, isAdmin };
  }

  const tier: MemberTier = "street";
  if (TIER_RANK[tier] < TIER_RANK[requiredTier]) {
    throw new AccessDeniedError(
      "insufficient_tier",
      `${requiredTier} access required, viewer is ${tier}.`
    );
  }

  return { viewer, tier, isAdmin: false };
}

// Convenience wrappers matching the four tiers directly.
export const requireStreetAccess = () => requireTierAccess("street");
export const requireBlockAccess = () => requireTierAccess("block");
export const requireCribAccess = () => requireTierAccess("crib");
export const requirePitAccess = () => requireTierAccess("pit");

/**
 * Pit access is necessary but NOT sufficient for the Misfit First Responder
 * / Narcan Watch features specifically. A minister/admin can have Pit access
 * for the prayer-space side without being an active on-call responder.
 * Check this separately for anything alert-related.
 */
export async function requireActiveResponder() {
  const { viewer, tier } = await requirePitAccess();
  if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");

  const [row] = await db
    .select({ isResponder: memberRoles.isMisfitFirstResponder })
    .from(memberRoles)
    .where(eq(memberRoles.memberId, viewer.id))
    .limit(1);

  if (!row?.isResponder) {
    throw new AccessDeniedError(
      "insufficient_role",
      "Active Misfit First Responder status required."
    );
  }

  return { viewer, tier };
}

export async function requireSiteRole(minRole: "moderator" | "admin") {
  const viewer = await getViewer();
  if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");

  const [row] = await db
    .select({ siteRole: memberRoles.siteRole })
    .from(memberRoles)
    .where(eq(memberRoles.memberId, viewer.id))
    .limit(1);

  const current = row?.siteRole ?? "member";
  if (ROLE_RANK[current] < ROLE_RANK[minRole]) {
    throw new AccessDeniedError("insufficient_role", `${minRole} role required.`);
  }
  return viewer;
}

/**
 * GAME CHALLENGE RULE: "you can challenge anyone at your tier or below,
 * never above." This is the helper every game/leaderboard feature should
 * call before allowing a challenge to be issued.
 */
export function canChallenge(challengerTier: MemberTier, targetTier: MemberTier): boolean {
  return TIER_RANK[challengerTier] >= TIER_RANK[targetTier];
}
