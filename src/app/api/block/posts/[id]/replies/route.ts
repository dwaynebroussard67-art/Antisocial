import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { createReplySchema } from "@/lib/block/post-schema";
import { assertReplyRateLimit, RateLimitedError } from "@/lib/block/rate-limit";
import { db } from "@/lib/db";
import { blockPosts, blockPostReplies } from "@/lib/db/schema/block-posts";
import { screenContent } from "@/lib/moderation/nura";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

/**
 * PORTED from salvage with ONE BUGFIX: the original GET handler defined a
 * broken `and_(postId)` helper that returned a bare comma expression
 * (`isNull(...), eq(...)`) instead of `and(isNull(...), eq(...))` — that's
 * a JS comma operator, not a combined condition, so it silently evaluated
 * to just the `eq(...)` clause and would have let deleted replies leak
 * back into the list. There was also a second, duplicate GET further down
 * in the same file that had the correct version. This file keeps the
 * correct version only.
 */

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rows = await db
    .select()
    .from(blockPostReplies)
    .where(
      and(
        eq(blockPostReplies.postId, params.id),
        isNull(blockPostReplies.deletedAt),
        // Quarantined replies are not served to anybody, including the
        // person who wrote them (see lib/moderation/nura.ts).
        eq(blockPostReplies.status, "published")
      )
    )
    .orderBy(asc(blockPostReplies.createdAt));
  return NextResponse.json({ replies: rows });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = createReplySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await assertReplyRateLimit(viewer.id);
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } }
      );
    }
    throw err;
  }

  const [post] = await db.select({ id: blockPosts.id }).from(blockPosts).where(eq(blockPosts.id, params.id)).limit(1);
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Written quarantined, promoted only if Nura clears it — same order as
  // block posts, for the same reason: no window where a held reply is
  // briefly visible. replyCount is NOT incremented here; a quarantined
  // reply must not bump a counter the whole feed can see, which would leak
  // that something was posted and then vanished.
  const [reply] = await db
    .insert(blockPostReplies)
    .values({ postId: params.id, authorId: viewer.id, body: parsed.data.body, status: "quarantined" })
    .returning();

  const decision = await screenContent({
    contentType: "block_reply",
    contentId: reply.id,
    authorId: viewer.id,
    text: parsed.data.body,
  });

  if (decision.publish) {
    await db.transaction(async (tx) => {
      await tx
        .update(blockPostReplies)
        .set({ status: "published" })
        .where(eq(blockPostReplies.id, reply.id));
      await tx
        .update(blockPosts)
        .set({ replyCount: sql`${blockPosts.replyCount} + 1` })
        .where(eq(blockPosts.id, params.id));
    });
  }

  // Same silence as block posts: identical 201, status hard-coded, no tell.
  return NextResponse.json({ reply: { ...reply, status: "published" } }, { status: 201 });
}
