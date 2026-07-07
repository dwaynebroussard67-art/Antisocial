import { NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { triviaAttempts } from "@/lib/db/schema/trivia";
import { getOrAssignTodaysQuestion } from "@/lib/arcade/trivia/daily";
import { and, eq } from "drizzle-orm";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  let viewer;
  try {
    ({ viewer } = await requireBlockAccess());
    if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const question = await getOrAssignTodaysQuestion();
  if (!question) {
    // Empty state surfaced honestly, matching the site's quote-of-the-day
    // convention — not a fabricated fallback question.
    return NextResponse.json({ question: null, empty: true });
  }

  const [attempt] = await db
    .select({ correct: triviaAttempts.correct })
    .from(triviaAttempts)
    .where(and(eq(triviaAttempts.memberId, viewer.id), eq(triviaAttempts.date, todayIso())))
    .limit(1);

  return NextResponse.json({
    question: {
      id: question.id,
      question: question.question,
      choices: question.choices,
      category: question.category,
      // correctIndex intentionally omitted — verification happens server-side in /submit
    },
    alreadyAttempted: !!attempt,
    wasCorrect: attempt ? attempt.correct === "true" : null,
  });
}
