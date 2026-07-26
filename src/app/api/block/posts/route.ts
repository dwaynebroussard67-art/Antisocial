import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blockPosts } from "@/lib/db/schema/block-posts";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { createPostSchema } from "@/lib/block/post-schema";
import { assertPostRateLimit, RateLimitedError } from "@/lib/block/rate-limit";
import { screenContent } from "@/lib/moderation/nura";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { z } from "zod";

// PORTED from salvage. Access-check import path updated to this project's
// lib/auth/roles.ts (cascade-aware); logic otherwise unchanged.

const listQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  sectionKey: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const parsed = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query", details: parsed.error.flatten() }, { status: 400 });
  }
  const { cursor, sectionKey, limit } = parsed.data;

  try {
    const conditions = [isNull(blockPosts.deletedAt), eq(blockPosts.status, "published")];
    if (cursor) conditions.push(lt(blockPosts.createdAt, new Date(cursor)));
    if (sectionKey) conditions.push(eq(blockPosts.sectionKey, sectionKey));

    const rows = await db
      .select()
      .from(blockPosts)
      .where(and(...conditions))
      .orderBy(desc(blockPosts.createdAt))
      .limit(limit);

    return NextResponse.json({
      posts: rows,
      nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) {
    console.error("[block/posts:GET]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = createPostSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await assertPostRateLimit(viewer.id);
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } }
      );
    }
    throw err;
  }

  try {
    // NURA SCREENING (D's correction, this session).
    //
    // The post is written QUARANTINED and only promoted to published once
    // Nura has cleared it. Inserting as published and demoting afterwards
    // would leave a window — however short — where the feed could serve
    // something that was about to be quarantined. There is no such window
    // this way round.
    const [post] = await db
      .insert(blockPosts)
      .values({
        authorId: viewer.id,
        sectionKey: parsed.data.sectionKey,
        title: parsed.data.title,
        body: parsed.data.body,
        tags: parsed.data.tags,
        status: "quarantined",
      })
      .returning();

    const decision = await screenContent({
      contentType: "block_post",
      contentId: post.id,
      authorId: viewer.id,
      // Title and body are screened together — a clean body under a title
      // carrying the whole payload would otherwise walk straight through.
      text: `${parsed.data.title}\n\n${parsed.data.body}`,
    });

    if (decision.publish) {
      await db.update(blockPosts).set({ status: "published" }).where(eq(blockPosts.id, post.id));
    }

    // THE SENDER IS NEVER TOLD. Identical 201 either way — same shape, same
    // status code, and `status` hard-coded to "published" rather than echoed
    // from the row, because echoing it would hand the author the verdict in
    // the response body. From their side the post went up normally; they
    // simply won't find it in the feed if it was held. The silence is the
    // requirement, not an oversight: they may have worded something badly,
    // or Nura may have misread them, and nothing is said either way while
    // that's being worked out.
    return NextResponse.json({ post: { ...post, status: "published" } }, { status: 201 });
  } catch (err) {
    console.error("[block/posts:POST]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
