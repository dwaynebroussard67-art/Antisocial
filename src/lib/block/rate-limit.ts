import { db } from "@/lib/db";
import { blockPosts, blockPostReplies } from "@/lib/db/schema/block-posts";
import { and, eq, gte, sql } from "drizzle-orm";

// PORTED from salvage, unchanged in logic.
export class RateLimitedError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`Rate limit exceeded. Try again in ${retryAfterSeconds}s.`);
    this.name = "RateLimitedError";
  }
}

const POST_WINDOW_MIN = 10;
const POST_MAX = 5;
const REPLY_WINDOW_MIN = 5;
const REPLY_MAX = 10;

export async function assertPostRateLimit(authorId: string): Promise<void> {
  const windowStart = new Date(Date.now() - POST_WINDOW_MIN * 60_000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blockPosts)
    .where(and(eq(blockPosts.authorId, authorId), gte(blockPosts.createdAt, windowStart)));
  if (count >= POST_MAX) throw new RateLimitedError(POST_WINDOW_MIN * 60);
}

export async function assertReplyRateLimit(authorId: string): Promise<void> {
  const windowStart = new Date(Date.now() - REPLY_WINDOW_MIN * 60_000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blockPostReplies)
    .where(and(eq(blockPostReplies.authorId, authorId), gte(blockPostReplies.createdAt, windowStart)));
  if (count >= REPLY_MAX) throw new RateLimitedError(REPLY_WINDOW_MIN * 60);
}
