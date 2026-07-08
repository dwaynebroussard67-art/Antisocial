import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { arcadeMatches } from "@/lib/db/schema/arcade-core";
import { and, eq, or, desc } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { gameKey: string } }) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const [match] = await db
    .select()
    .from(arcadeMatches)
    .where(
      and(
        eq(arcadeMatches.gameKey, params.gameKey),
        or(eq(arcadeMatches.playerAId, viewer.id), eq(arcadeMatches.playerBId, viewer.id)),
        eq(arcadeMatches.status, "active")
      )
    )
    .orderBy(desc(arcadeMatches.createdAt))
    .limit(1);

  return NextResponse.json({ match: match ?? null });
}
