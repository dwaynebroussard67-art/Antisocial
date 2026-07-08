import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { missionBoardNeeds, missionBoardSignups } from "@/lib/db/schema/mission-board";
import { requireCribAccess, AccessDeniedError } from "@/lib/auth/roles";
import { createNeedSchema } from "@/lib/mission-board/schema";
import { and, eq, desc, lt, sql } from "drizzle-orm";
import { z } from "zod";

// PORTED from salvage. requireHouseAccess -> requireCribAccess (tier rename).
// Posting a need requires Crib+; signing up for one (see [id]/signup/route.ts)
// only requires Block, same asymmetry as the salvage.

const listQuerySchema = z.object({
  category: z.string().optional(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const parsed = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  const { category, cursor, limit } = parsed.data;

  const conditions = [eq(missionBoardNeeds.status, "open")];
  if (category) conditions.push(eq(missionBoardNeeds.category, category as any));
  if (cursor) conditions.push(lt(missionBoardNeeds.createdAt, new Date(cursor)));

  const needs = await db
    .select({
      id: missionBoardNeeds.id,
      title: missionBoardNeeds.title,
      description: missionBoardNeeds.description,
      category: missionBoardNeeds.category,
      isVirtual: missionBoardNeeds.isVirtual,
      location: missionBoardNeeds.location,
      slotsNeeded: missionBoardNeeds.slotsNeeded,
      deadline: missionBoardNeeds.deadline,
      createdAt: missionBoardNeeds.createdAt,
      slotsFilled: sql<number>`(
        SELECT count(*)::int FROM mission_board_signups
        WHERE need_id = ${missionBoardNeeds.id} AND status = 'active'
      )`,
    })
    .from(missionBoardNeeds)
    .where(and(...conditions))
    .orderBy(desc(missionBoardNeeds.createdAt))
    .limit(limit);

  return NextResponse.json({
    needs,
    nextCursor: needs.length === limit ? needs[needs.length - 1].createdAt.toISOString() : null,
  });
}

export async function POST(req: NextRequest) {
  let viewer;
  try {
    viewer = (await requireCribAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.reason }, { status: err.reason === "unauthenticated" ? 401 : 403 });
    }
    throw err;
  }

  const parsed = createNeedSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const [need] = await db
    .insert(missionBoardNeeds)
    .values({
      ...parsed.data,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      createdBy: viewer.id,
    })
    .returning();

  return NextResponse.json({ need }, { status: 201 });
}
