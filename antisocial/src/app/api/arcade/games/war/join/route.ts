import { NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { joinQueueOrMatch } from "@/lib/arcade/matchmaking";
import { buildShuffledDecks } from "@/lib/arcade/war/engine";

// PORTED from salvage, rename applied: requireBlockAccess is already the
// correct check (Block tier — same as every other arcade route so far).

export async function POST() {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const result = await joinQueueOrMatch(viewer.id, "war", () => {
    const { deckA, deckB } = buildShuffledDecks();
    return { deckA, deckB, round: 0, log: [], winnerId: null };
  });

  return NextResponse.json(result);
}
