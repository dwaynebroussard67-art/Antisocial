import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { blockPosts, blockPostCheers } from "@/lib/db/schema/block-posts";
import { and, eq, sql } from "drizzle-orm";

// PORTED from salvage, unchanged in logic. Toggle: cheering an already-
// cheered post un-cheers it. Uses onConflictDoNothing + a re-check so two
// concurrent requests from the same member can't double/negative-count.

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: blockPostCheers.id })
      .from(blockPostCheers)
      .where(and(eq(blockPostCheers.postId, params.id), eq(blockPostCheers.memberId, viewer.id)))
      .limit(1);

    if (existing.length > 0) {
      const deleted = await tx
        .delete(blockPostCheers)
        .where(eq(blockPostCheers.id, existing[0].id))
        .returning({ id: blockPostCheers.id });
      if (deleted.length === 0) return { cheered: true }; // already removed by a concurrent request
      await tx.update(blockPosts).set({ cheerCount: sql`${blockPosts.cheerCount} - 1` }).where(eq(blockPosts.id, params.id));
      return { cheered: false };
    }

    const inserted = await tx
      .insert(blockPostCheers)
      .values({ postId: params.id, memberId: viewer.id })
      .onConflictDoNothing({ target: [blockPostCheers.postId, blockPostCheers.memberId] })
      .returning({ id: blockPostCheers.id });
    if (inserted.length === 0) return { cheered: true }; // already cheered by a concurrent request, no double count
    await tx.update(blockPosts).set({ cheerCount: sql`${blockPosts.cheerCount} + 1` }).where(eq(blockPosts.id, params.id));
    return { cheered: true };
  });

  return NextResponse.json(result);
}
