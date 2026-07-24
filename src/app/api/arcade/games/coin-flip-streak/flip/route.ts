import { NextRequest, NextResponse } from "next/server";
import { requireStreetAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { arcadeScores } from "@/lib/db/schema/arcade-core";
import { assertPlayable } from "@/lib/arcade/assert-playable";
import { recordArcadeActivity } from "@/lib/arcade/streaks";
import { z } from "zod";

const schema = z.object({
  guess: z.enum(["heads", "tails"]),
  currentStreak: z.number().int().min(0).max(1000),
});

export async function POST(req: NextRequest) {
  // Street floor + registry check (D's correction): the Street plays the
  // simple games. assertPlayable is what actually decides, not the floor.
  let viewer;
  let tier;
  try {
    ({ viewer, tier } = await requireStreetAccess());
    if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    await assertPlayable("coin_flip_streak", tier, viewer.id);
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

  // Server flips the coin — the client cannot influence or predict this.
  const result: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
  const won = result === parsed.data.guess;
  const newStreak = won ? parsed.data.currentStreak + 1 : 0;

  if (!won && parsed.data.currentStreak > 0) {
    await db.insert(arcadeScores).values({ memberId: viewer.id, gameKey: "coin_flip_streak", score: parsed.data.currentStreak });
  }
  await recordArcadeActivity(viewer.id);

  return NextResponse.json({ result, won, newStreak });
}
