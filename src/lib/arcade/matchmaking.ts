import { db } from "@/lib/db";
import { arcadeRatings, arcadeMatches } from "@/lib/db/schema/arcade-core";
import { divisionForRating } from "./divisions";
import { eq, and, sql } from "drizzle-orm";

// PORTED from salvage, using the LATER revision found in the reference dump
// (buildInitialState as a function invoked once a match is confirmed, not a
// plain object built blind beforehand). This lets asymmetric games — Chess:
// who's white/black — assign roles correctly once sub-piece 3 needs it; War
// doesn't need asymmetry but the same signature is used so this file doesn't
// change shape again next sub-piece.
//
// Rename applied: blockMembers -> members (via arcadeRatings/arcadeMatches's
// own FKs, nothing else to rename here).

export async function getOrCreateRating(memberId: string, gameKey: string): Promise<number> {
  const [row] = await db
    .select({ rating: arcadeRatings.rating })
    .from(arcadeRatings)
    .where(and(eq(arcadeRatings.memberId, memberId), eq(arcadeRatings.gameKey, gameKey)))
    .limit(1);

  if (row) return row.rating;

  await db
    .insert(arcadeRatings)
    .values({ memberId, gameKey })
    .onConflictDoNothing({ target: [arcadeRatings.memberId, arcadeRatings.gameKey] });
  return 1200;
}

type QueueResult =
  | { status: "matched"; matchId: string; opponentId: string }
  | { status: "queued" };

export async function joinQueueOrMatch(
  memberId: string,
  gameKey: string,
  buildInitialState: (opponentId: string, selfId: string) => unknown
): Promise<QueueResult> {
  const rating = await getOrCreateRating(memberId, gameKey);
  const division = divisionForRating(rating);

  return db.transaction(async (tx) => {
    // FOR UPDATE SKIP LOCKED: the correct Postgres idiom for a work queue —
    // if two members join in the same instant, they can never both claim the
    // same waiting opponent row.
    const waiting = (await tx.execute(sql`
      SELECT id, member_id FROM arcade_matchmaking_queue
      WHERE game_key = ${gameKey} AND division = ${division} AND member_id != ${memberId}
      ORDER BY queued_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `)) as unknown as [{ id: string; member_id: string }];

    const opponent = waiting[0];

    if (!opponent) {
      // ON CONFLICT: repeated join-clicks refresh queue position instead of
      // stacking duplicate rows (the unique index on member_id+game_key
      // already exists in arcade-core.ts's arcadeMatchmakingQueue).
      await tx.execute(sql`
        INSERT INTO arcade_matchmaking_queue (member_id, game_key, division)
        VALUES (${memberId}, ${gameKey}, ${division})
        ON CONFLICT (member_id, game_key)
        DO UPDATE SET queued_at = now(), division = EXCLUDED.division
      `);
      return { status: "queued" as const };
    }

    await tx.execute(sql`DELETE FROM arcade_matchmaking_queue WHERE id = ${opponent.id}`);

    const initialState = buildInitialState(opponent.member_id, memberId);

    const [match] = await tx
      .insert(arcadeMatches)
      .values({
        gameKey,
        playerAId: opponent.member_id, // whoever was already waiting
        playerBId: memberId, // whoever just joined and triggered the match
        state: initialState,
      })
      .returning({ id: arcadeMatches.id });

    return { status: "matched" as const, matchId: match.id, opponentId: opponent.member_id };
  });
}
