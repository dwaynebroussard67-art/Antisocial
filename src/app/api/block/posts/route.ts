import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blockPosts } from "@/lib/db/schema/block-posts";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { createPostSchema } from "@/lib/block/post-schema";
import { assertPostRateLimit, RateLimitedError } from "@/lib/block/rate-limit";
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
    const [post] = await db
      .insert(blockPosts)
      .values({
        authorId: viewer.id,
        sectionKey: parsed.data.sectionKey,
        title: parsed.data.title,
        body: parsed.data.body,
        tags: parsed.data.tags,
      })
      .returning();
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("[block/posts:POST]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
