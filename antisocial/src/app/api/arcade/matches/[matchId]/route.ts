import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { arcadeMatches } from "@/lib/db/schema/arcade-core";
import { eq } from "drizzle-orm";

// Generic across every head_to_head arcade game (just War for now). Polling,
// not WebSockets/SSE — a deliberate stand-in until a real real-time layer
// exists, matching the `usePolling` hook already used by notifications.

export async function GET(_req: NextRequest, { params }: { params: { matchId: string } }) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const [match] = await db.select().from(arcadeMatches).where(eq(arcadeMatches.id, params.matchId)).limit(1);
  if (!match) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (match.playerAId !== viewer.id && match.playerBId !== viewer.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ match });
}
