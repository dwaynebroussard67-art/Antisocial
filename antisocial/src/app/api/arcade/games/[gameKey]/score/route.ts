import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { arcadeGames, arcadeScores } from "@/lib/db/schema/arcade-core";
import { recordArcadeActivity } from "@/lib/arcade/streaks";
import { eq } from "drizzle-orm";
import { z } from "zod";

// PORTED from salvage, adapted to requireBlockAccess/requireCribAccess
// conventions. This is the shared endpoint for any solo_score game whose
// score does not need server-side verification (Reaction Timer: reaction
// time IS the score, there's nothing to fake-check). Games like Word
// Scramble and Coin Flip Streak, where the client could otherwise submit an
// arbitrary "I won" score, have their own dedicated verify-then-record
// routes instead of using this one.
const submitSchema = z.object({
  score: z.number().int().min(0).max(10_000_000), // ceiling guards against a corrupted client submitting garbage
  metadata: z.record(z.unknown()).default({}),
});

export async function POST(req: NextRequest, { params }: { params: { gameKey: string } }) {
  let viewer;
  try {
    ({ viewer } = await requireBlockAccess());
    if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const [game] = await db.select().from(arcadeGames).where(eq(arcadeGames.key, params.gameKey)).limit(1);
  if (!game || game.kind !== "solo_score") return NextResponse.json({ error: "not_found" }, { status: 404 });

  const parsed = submitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });

  const [score] = await db.insert(arcadeScores).values({
    memberId: viewer.id,
    gameKey: params.gameKey,
    score: parsed.data.score,
    metadata: parsed.data.metadata,
  }).returning();

  await recordArcadeActivity(viewer.id);

  return NextResponse.json({ score }, { status: 201 });
}
