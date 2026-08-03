import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { eq, sql } from "drizzle-orm";

/**
 * THE AGE GATE — the one place application code asks about age.
 *
 * The database has the authoritative predicates (migration 0003:
 * member_is_adult, member_can_access, member_can_view). These wrappers
 * exist so TypeScript callers don't hand-roll the check and accidentally
 * write a version that fails OPEN.
 *
 * THE RULE: 'unknown' denies exactly as 'minor' does. Never infer age
 * from donation history, purchase history, writing style, or anything
 * else. Either a human decided, or the answer is no.
 */

/**
 * Is this member a verified adult?
 *
 * Returns false for unknown, for minor, and for a member id that doesn't
 * exist. There is deliberately no third state and no "probably" — every
 * uncertain case is a denial.
 */
export async function isVerifiedAdult(memberId: string): Promise<boolean> {
  const [row] = await db
    .select({ ageStatus: members.ageStatus })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  return row?.ageStatus === "adult";
}

/**
 * Can this member see a registered content item?
 *
 * Delegates to the database function so the two-axis rule (place AND
 * sensitivity) lives in exactly one place. An unknown item code returns
 * false — fail closed, so a typo hides content rather than exposing it.
 *
 * Item codes are registered in the `content_items` table, not here, so a
 * new gated asset is a data change rather than a deploy.
 */
export async function canViewContent(memberId: string, itemCode: string): Promise<boolean> {
  const rows = await db.execute<{ allowed: boolean | null }>(
    sql`select member_can_view(${memberId}::uuid, ${itemCode}) as allowed`
  );
  return rows[0]?.allowed === true;
}
