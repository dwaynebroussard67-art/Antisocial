import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";
import { eq } from "drizzle-orm";
import type { MemberTier } from "@/lib/auth/roles";
import { assertPromotionAuthority } from "./promotion";

/**
 * AUTO-TIER ASSIGNMENT
 *
 * Per your description: tier is never self-selected, and never bought or
 * gamed through play. It's read off a person's real history the moment
 * they sign in.
 *
 * IMPORTANT — Crib and Pit are NOT fully automatic:
 *  - Crib requires a human (staff/minister) to have verified real program
 *    participation, OR the member being ministry staff. There is no
 *    donation amount or sign-in count that alone earns Crib — you were
 *    explicit that it's not something you can buy or grind your way into.
 *  - Pit requires being an active Misfit First Responder, which only
 *    happens through the Narcan QR flow, handled entirely on the
 *    Ministries/Nura side. This function never sets Pit access; it only
 *    ever reads what's already true there.
 *
 * What IS automatic here is the Street -> Block transition (giving an
 * email is what earns Block), and re-affirming Crib/Pit status that a
 * human already granted, on every sign-in.
 */
export async function computeAndApplyTier(memberId: string): Promise<MemberTier> {
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) throw new Error(`computeAndApplyTier: no member ${memberId}`);

  const [roleRow] = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, memberId))
    .limit(1);

  // Pit and Crib are grants, not computations — if already set, don't
  // downgrade them here based on donation/purchase signals.
  if (roleRow?.tier === "pit" || roleRow?.tier === "crib") {
    return roleRow.tier;
  }

  const hasVerifiedEmail = Boolean(member.email && member.emailVerifiedAt);
  const staffOrVerifiedProgram = member.isMinistryStaff || Boolean(member.programParticipationVerifiedAt);

  let nextTier: MemberTier = "street";
  if (staffOrVerifiedProgram) {
    nextTier = "crib";
  } else if (hasVerifiedEmail) {
    nextTier = "block";
  }

  // BUGFIX (this session): this was update-only, so if a member somehow
  // reached this point with no memberRoles row yet, the WHERE matched
  // zero rows and the write silently no-op'd — the function would still
  // return `nextTier` as if it had been persisted. Every current call
  // site happens to create the role row first (session.ts's
  // ensureRoleRow, anonymous-identity.ts), so this wasn't reachable today,
  // but it's a silent-failure trap for the next call site that forgets
  // to. Upsert instead, so it's correct on its own.
  await db
    .insert(memberRoles)
    .values({ memberId, tier: nextTier })
    .onConflictDoUpdate({
      target: memberRoles.memberId,
      set: { tier: nextTier, updatedAt: new Date() },
    });

  return nextTier;
}

/**
 * Call this whenever a minister/admin manually vouches for a non-staff
 * member's program participation — this is the "gave up their time"
 * path into the Crib you described, kept separate from any automatic
 * computation on purpose.
 *
 * AUTHORITY CHECK ADDED (D's correction, this session): `grantedBy` was
 * previously taken on trust — the function recorded who did it but never
 * checked whether they were allowed to. Promotion authority is site_role,
 * never tier; see tiers/promotion.ts for why that distinction is load-bearing
 * (the Pit can reach anyone and must still not be able to advance anyone).
 */
export async function grantCribByProgramParticipation(memberId: string, grantedBy: string) {
  await assertPromotionAuthority(grantedBy);

  const now = new Date();
  await db
    .update(members)
    .set({ programParticipationVerifiedAt: now, programParticipationVerifiedBy: grantedBy })
    .where(eq(members.id, memberId));

  await db
    .update(memberRoles)
    .set({ tier: "crib", cribGrantedAt: now, cribGrantedBy: grantedBy, updatedAt: now })
    .where(eq(memberRoles.memberId, memberId));
}
