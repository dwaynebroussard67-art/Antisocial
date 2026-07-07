import { db } from "@/lib/db";
import { arcadeDailyStreaks } from "@/lib/db/schema/arcade-core";
import { emitMemberEvent } from "@/lib/roles/events";
import { eq, sql } from "drizzle-orm";

// PORTED from salvage, unchanged in behavior. No rename needed — this file
// never touches the members table directly.

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Called once per arcade activity (score submission, trivia attempt, or
// eventually match completion). Idempotent for repeat calls on the same
// calendar day — playing 10 games in one day counts as one day of activity,
// not ten.
export async function recordArcadeActivity(memberId: string): Promise<void> {
  const today = isoDate(new Date());

  const [existing] = await db
    .select()
    .from(arcadeDailyStreaks)
    .where(eq(arcadeDailyStreaks.memberId, memberId))
    .limit(1);

  if (!existing) {
    await db.insert(arcadeDailyStreaks).values({
      memberId,
      currentStreak: 1,
      longestStreak: 1,
      totalActiveDays: 1,
      lastActiveDate: today,
    });
    return;
  }

  if (existing.lastActiveDate === today) return; // already counted today, no-op

  const yesterday = isoDate(new Date(Date.now() - 86_400_000));
  const newCurrent = existing.lastActiveDate === yesterday ? existing.currentStreak + 1 : 1;
  const newLongest = Math.max(existing.longestStreak, newCurrent);

  await db.update(arcadeDailyStreaks).set({
    currentStreak: newCurrent,
    longestStreak: newLongest,
    totalActiveDays: sql`${arcadeDailyStreaks.totalActiveDays} + 1`,
    lastActiveDate: today,
  }).where(eq(arcadeDailyStreaks.memberId, memberId));

  if (newCurrent > 0 && newCurrent % 7 === 0) {
    await emitMemberEvent(memberId, "arcade.streak_hit", { streakLength: newCurrent });
  }
}
