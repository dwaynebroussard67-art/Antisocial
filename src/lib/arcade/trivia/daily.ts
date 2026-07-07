import { db } from "@/lib/db";
import { triviaQuestions, triviaDailyRotation } from "@/lib/db/schema/trivia";
import { eq, sql } from "drizzle-orm";

// NOT in the salvage — the salvage assumed a rotation row already existed
// for "today" without saying how it gets there. Named gap, closed here:
// this function ensures one exists (transactionally, so two concurrent
// first-visitors-of-the-day can't both try to insert different questions),
// rather than 500ing on any day nobody pre-populated the rotation table.
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOrAssignTodaysQuestion() {
  const today = todayIso();

  const [existing] = await db
    .select({ questionId: triviaDailyRotation.questionId })
    .from(triviaDailyRotation)
    .where(eq(triviaDailyRotation.date, today))
    .limit(1);

  let questionId: string | null | undefined = existing?.questionId;

  if (!questionId) {
    questionId = await db.transaction(async (tx): Promise<string | null> => {
      // Re-check inside the transaction — a concurrent request may have
      // just inserted today's row between the SELECT above and here.
      const [row] = await tx
        .select({ questionId: triviaDailyRotation.questionId })
        .from(triviaDailyRotation)
        .where(eq(triviaDailyRotation.date, today))
        .limit(1);
      if (row) return row.questionId;

      const [picked] = await tx
        .select({ id: triviaQuestions.id })
        .from(triviaQuestions)
        .orderBy(sql`random()`)
        .limit(1);
      if (!picked) return null;

      await tx
        .insert(triviaDailyRotation)
        .values({ date: today, questionId: picked.id })
        .onConflictDoNothing({ target: triviaDailyRotation.date });

      return picked.id;
    });
  }

  if (!questionId) return null; // empty state: no trivia questions exist yet at all

  const [question] = await db.select().from(triviaQuestions).where(eq(triviaQuestions.id, questionId)).limit(1);
  return question ?? null;
}
