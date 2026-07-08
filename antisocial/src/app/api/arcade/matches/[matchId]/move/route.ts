import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { arcadeMatches, arcadeRatings } from "@/lib/db/schema/arcade-core";
import { playRound, WarState } from "@/lib/arcade/war/engine";
import { computeEloUpdate } from "@/lib/arcade/elo";
import { getOrCreateRating } from "@/lib/arcade/matchmaking";
import { recordArcadeActivity } from "@/lib/arcade/streaks";
import { eq, and, sql } from "drizzle-orm";

// War is the only head_to_head game wired up this sub-piece, so this route
// is War-specific for now (checks gameKey === "war" below) rather than a
// generic per-game dispatcher. When Chess (sub-piece 3) lands, this either
// becomes a shared dispatcher or War/Chess each get their own move route —
// deferred to that sub-piece, not decided prematurely here.

export async function POST(_req: NextRequest, { params }: { params: { matchId: string } }) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const outcome = await db.transaction(async (tx) => {
    // Row lock: two rapid clicks (or a legitimate race between both players'
    // clients polling) can never both advance the same round twice.
    const locked = (await tx.execute(
      sql`SELECT * FROM arcade_matches WHERE id = ${params.matchId} FOR UPDATE`
    )) as unknown as [any];
    const match = locked[0];

    if (!match) return { httpStatus: 404 as const, body: { error: "not_found" } };
    if (match.game_key !== "war") return { httpStatus: 400 as const, body: { error: "wrong_game" } };
    if (match.player_a_id !== viewer.id && match.player_b_id !== viewer.id) {
      return { httpStatus: 403 as const, body: { error: "forbidden" } };
    }
    if (match.status === "completed") {
      return { httpStatus: 200 as const, body: { state: match.state, status: "completed" } };
    }

    const newState = playRound(match.state as WarState);
    const isDone = newState.winnerId !== null;

    await tx
      .update(arcadeMatches)
      .set({
        state: newState,
        status: isDone ? "completed" : "active",
        completedAt: isDone ? new Date() : null,
        winnerId:
          isDone && newState.winnerId !== "draw"
            ? newState.winnerId === "A"
              ? match.player_a_id
              : match.player_b_id
            : null,
      })
      .where(eq(arcadeMatches.id, params.matchId));

    return {
      httpStatus: 200 as const,
      body: { state: newState, status: isDone ? "completed" : "active" },
      isDone,
      newState,
      match,
    };
  });

  if (outcome.httpStatus !== 200 || !("isDone" in outcome)) {
    return NextResponse.json(outcome.body, { status: outcome.httpStatus });
  }

  // Elo/streak writes happen after the transaction commits, outside the row
  // lock — keeps the lock's duration limited to the deck mutation itself.
  if (outcome.isDone && outcome.newState.winnerId !== "draw") {
    const { match, newState } = outcome;
    const ratingA = await getOrCreateRating(match.player_a_id, "war");
    const ratingB = await getOrCreateRating(match.player_b_id, "war");
    const outcomeForA = newState.winnerId === "A" ? 1 : 0;
    const { newRatingA, newRatingB } = computeEloUpdate(ratingA, ratingB, outcomeForA);

    await db
      .update(arcadeRatings)
      .set({ rating: newRatingA, gamesPlayed: sql`${arcadeRatings.gamesPlayed} + 1` })
      .where(and(eq(arcadeRatings.memberId, match.player_a_id), eq(arcadeRatings.gameKey, "war")));
    await db
      .update(arcadeRatings)
      .set({ rating: newRatingB, gamesPlayed: sql`${arcadeRatings.gamesPlayed} + 1` })
      .where(and(eq(arcadeRatings.memberId, match.player_b_id), eq(arcadeRatings.gameKey, "war")));

    await recordArcadeActivity(match.player_a_id);
    await recordArcadeActivity(match.player_b_id);
  }

  return NextResponse.json(outcome.body, { status: outcome.httpStatus });
}
