import { NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST() {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  await db.execute(sql`DELETE FROM arcade_matchmaking_queue WHERE member_id = ${viewer.id} AND game_key = 'war'`);
  return NextResponse.json({ status: "left_queue" });
}
