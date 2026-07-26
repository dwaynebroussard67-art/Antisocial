import { NextRequest, NextResponse } from "next/server";
import { requireStreetAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { triviaQuestions, triviaAttempts } from "@/lib/db/schema/trivia";
import { arcadeScores } from "@/lib/db/schema/arcade-core";
import { assertPlayable } from "@/lib/arcade/assert-playable";
import { recordArcadeActivity } from "@/lib/arcade/streaks";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const schema = z.object({
  questionId: z.string().uuid(),
  choiceIndex: z.number().int().min(0).max(3),
});

export async function POST(req: NextRequest) {
  // Street floor + registry check (D's correction) — trivia is one of the
  // simple games the Street plays.
  let viewer;
  let tier;
  try {
    ({ viewer, tier } = await requireStreetAccess());
    if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    await assertPlayable("trivia", tier, viewer.id);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json(
        { error: err.reason },
        { status: err.reason === "unauthenticated" ? 401 : 403 }
      );
    }
    throw err;
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const today = todayIso();

  const [existing] = await db
    .select({ id: triviaAttempts.id })
    .from(triviaAttempts)
    .where(and(eq(triviaAttempts.memberId, viewer.id), eq(triviaAttempts.date, today)))
    .limit(1);
  if (existing) return NextResponse.json({ error: "already_attempted" }, { status: 409 });

  const [question] = await db.select().from(triviaQuestions).where(eq(triviaQuestions.id, parsed.data.questionId)).limit(1);
  if (!question) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const correct = question.correctIndex === parsed.data.choiceIndex;

  try {
    await db.insert(triviaAttempts).values({
      memberId: viewer.id,
      date: today,
      correct: correct ? "true" : "false",
    });
  } catch {
    // Unique index (memberId, date) caught a race from a second concurrent
    // submit — treat it the same as the pre-check above, not a 500.
    return NextResponse.json({ error: "already_attempted" }, { status: 409 });
  }

  if (correct) {
    await db.insert(arcadeScores).values({ memberId: viewer.id, gameKey: "trivia", score: 1 });
  }
  await recordArcadeActivity(viewer.id);

  return NextResponse.json({ correct, correctIndex: question.correctIndex });
}
