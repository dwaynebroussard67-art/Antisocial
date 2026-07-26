import { NextRequest, NextResponse } from "next/server";
import { requireStreetAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { arcadeScores } from "@/lib/db/schema/arcade-core";
import { assertPlayable } from "@/lib/arcade/assert-playable";
import { recordArcadeActivity } from "@/lib/arcade/streaks";
import { z } from "zod";

const schema = z.object({ roundId: z.string(), guess: z.string().max(50) });

export async function POST(req: NextRequest) {
  // Street floor + registry check (D's correction) — word scramble is one
  // of the simple games the Street plays.
  let viewer;
  let tier;
  try {
    ({ viewer, tier } = await requireStreetAccess());
    if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    await assertPlayable("word_scramble", tier, viewer.id);
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

  const correct = parsed.data.guess.trim().toUpperCase() === parsed.data.roundId.toUpperCase();

  if (correct) {
    await db.insert(arcadeScores).values({ memberId: viewer.id, gameKey: "word_scramble", score: 1 });
    await recordArcadeActivity(viewer.id);
  }

  return NextResponse.json({ correct });
}
