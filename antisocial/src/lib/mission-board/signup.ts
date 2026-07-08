import { db } from "@/lib/db";
import { missionBoardNeeds, missionBoardSignups } from "@/lib/db/schema/mission-board";
import { and, eq, sql } from "drizzle-orm";

/**
 * PORTED from the salvage, unchanged logic. Row-level lock: every
 * concurrent signup attempt for this need serializes here, which is what
 * prevents both overselling slots and double-signup races.
 */
export class MissionBoardError extends Error {
  constructor(public code: "not_found" | "closed" | "past_deadline" | "full" | "already_signed_up") {
    super(code);
  }
}

export async function signUpForNeed(needId: string, memberId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = (await tx.execute(
      sql`SELECT id, status, slots_needed, deadline FROM mission_board_needs WHERE id = ${needId} FOR UPDATE`
    )) as unknown as [{ id: string; status: string; slots_needed: number; deadline: Date | null }];
    const need = locked[0];

    if (!need) throw new MissionBoardError("not_found");
    if (need.status !== "open") throw new MissionBoardError("closed");
    if (need.deadline && new Date(need.deadline) < new Date()) throw new MissionBoardError("past_deadline");

    const [existing] = await tx
      .select({ id: missionBoardSignups.id })
      .from(missionBoardSignups)
      .where(
        and(
          eq(missionBoardSignups.needId, needId),
          eq(missionBoardSignups.memberId, memberId),
          eq(missionBoardSignups.status, "active")
        )
      )
      .limit(1);
    if (existing) throw new MissionBoardError("already_signed_up");

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(missionBoardSignups)
      .where(and(eq(missionBoardSignups.needId, needId), eq(missionBoardSignups.status, "active")));
    if (count >= need.slots_needed) throw new MissionBoardError("full");

    // Reactivate a prior cancelled signup rather than inserting a duplicate row
    const [priorCancelled] = await tx
      .select({ id: missionBoardSignups.id })
      .from(missionBoardSignups)
      .where(
        and(
          eq(missionBoardSignups.needId, needId),
          eq(missionBoardSignups.memberId, memberId),
          eq(missionBoardSignups.status, "cancelled")
        )
      )
      .limit(1);

    if (priorCancelled) {
      await tx
        .update(missionBoardSignups)
        .set({ status: "active", signedUpAt: sql`now()`, cancelledAt: null })
        .where(eq(missionBoardSignups.id, priorCancelled.id));
    } else {
      await tx.insert(missionBoardSignups).values({ needId, memberId });
    }
  });
}

export async function cancelSignup(needId: string, memberId: string): Promise<void> {
  const result = await db
    .update(missionBoardSignups)
    .set({ status: "cancelled", cancelledAt: sql`now()` })
    .where(
      and(
        eq(missionBoardSignups.needId, needId),
        eq(missionBoardSignups.memberId, memberId),
        eq(missionBoardSignups.status, "active")
      )
    )
    .returning({ id: missionBoardSignups.id });

  if (result.length === 0) throw new MissionBoardError("not_found");
}
