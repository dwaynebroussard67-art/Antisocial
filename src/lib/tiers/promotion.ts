import { db } from "@/lib/db";
import { memberRoles } from "@/lib/db/schema/member-roles";
import { eq } from "drizzle-orm";
import { AccessDeniedError } from "@/lib/auth/roles";

/**
 * PROMOTION AUTHORITY — site_role only, tier never.
 *
 * D's correction: the Pit can see everybody and talk to anybody, but the Pit
 * "cannot advance people. They can't promote people." Reach is not rank.
 *
 * The trap this guards against is subtle and would have been easy to write:
 * every other capability on this site scales with tier, so a promotion path
 * that checked `requirePitAccess()` would look perfectly idiomatic next to
 * the rest of the codebase and would be wrong. Promotion is a STAFF action
 * (site_role moderator/admin), which is an orthogonal axis — a Street-tier
 * admin may promote; a Pit-tier member with no site role may not.
 *
 * Anything that raises a member's tier must call assertPromotionAuthority()
 * first. Nothing should ever gate a promotion on the actor's tier.
 */
export async function assertPromotionAuthority(actorId: string): Promise<void> {
  const [row] = await db
    .select({ siteRole: memberRoles.siteRole, tier: memberRoles.tier })
    .from(memberRoles)
    .where(eq(memberRoles.memberId, actorId))
    .limit(1);

  const siteRole = row?.siteRole ?? "member";

  if (siteRole !== "admin" && siteRole !== "moderator") {
    throw new AccessDeniedError(
      "insufficient_role",
      // Deliberately mentions the tier in the message: when this fires on a
      // Pit member it should be obvious WHY, so nobody "fixes" it by adding
      // a tier check.
      `Promotion requires staff site_role, not tier (actor tier: ${row?.tier ?? "street"}, role: ${siteRole}).`
    );
  }
}
