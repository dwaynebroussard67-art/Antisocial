import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcadeGames, arcadeScores, arcadeRatings } from "@/lib/db/schema/arcade-core";
import { members } from "@/lib/db/schema/members";
import { DIVISIONS } from "@/lib/arcade/divisions";
import { eq, desc, asc, and, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";

// PORTED from salvage. HANDOFF-18 (sub-piece 1) deliberately left the
// head_to_head/"rating" branch unimplemented since no such game existed yet.
// War (sub-piece 2) is the first, so that branch is filled in here.
const querySchema = z.object({
  division: z.enum(["bronze", "silver", "gold", "platinum", "elite"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest, { params }: { params: { gameKey: string } }) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  const { division, limit } = parsed.data;

  const [game] = await db.select().from(arcadeGames).where(eq(arcadeGames.key, params.gameKey)).limit(1);
  if (!game) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    if (game.kind === "head_to_head") {
      const conditions = [eq(arcadeRatings.gameKey, params.gameKey)];
      if (division) {
        const idx = DIVISIONS.findIndex((d) => d.name === division);
        conditions.push(gte(arcadeRatings.rating, DIVISIONS[idx].minRating));
        if (idx < DIVISIONS.length - 1) conditions.push(lt(arcadeRatings.rating, DIVISIONS[idx + 1].minRating));
      }

      const rows = await db
        .select({ memberId: arcadeRatings.memberId, name: members.displayName, rating: arcadeRatings.rating })
        .from(arcadeRatings)
        .innerJoin(members, eq(arcadeRatings.memberId, members.id))
        .where(and(...conditions))
        .orderBy(desc(arcadeRatings.rating))
        .limit(limit);

      return NextResponse.json({ kind: "rating", entries: rows });
    }

    if (game.kind !== "solo_score") {
      // multiplayer (Mystery, sub-piece 4) not implemented yet.
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const isHigherBetter = game.scoreDirection === "higher_better";
    const aggFn = isHigherBetter ? sql`MAX(${arcadeScores.score})` : sql`MIN(${arcadeScores.score})`;

    const rows = await db
      .select({
        memberId: arcadeScores.memberId,
        name: members.displayName,
        bestScore: aggFn.as("best_score"),
      })
      .from(arcadeScores)
      .innerJoin(members, eq(arcadeScores.memberId, members.id))
      .where(eq(arcadeScores.gameKey, params.gameKey))
      .groupBy(arcadeScores.memberId, members.displayName)
      .orderBy(isHigherBetter ? desc(sql`best_score`) : asc(sql`best_score`))
      .limit(limit);

    return NextResponse.json({ kind: "score", entries: rows });
  } catch (err) {
    console.error("[arcade/leaderboard:GET]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
