import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { workshopDiscussionComments } from "@/lib/db/schema/workshop";
import { asc, and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

// PORTED from salvage, unchanged logic.

const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rows = await db
    .select()
    .from(workshopDiscussionComments)
    .where(and(eq(workshopDiscussionComments.projectId, params.id), isNull(workshopDiscussionComments.deletedAt)))
    .orderBy(asc(workshopDiscussionComments.createdAt));

  return NextResponse.json({ comments: rows });
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

  const parsed = commentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const [comment] = await db
    .insert(workshopDiscussionComments)
    .values({ projectId: params.id, authorId: viewer.id, body: parsed.data.body })
    .returning();

  return NextResponse.json({ comment }, { status: 201 });
}
