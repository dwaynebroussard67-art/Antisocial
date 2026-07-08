import { NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema/notifications";
import { eq, desc, and, isNull, sql } from "drizzle-orm";

// PORTED from salvage, unchanged in logic.
export async function GET() {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.memberId, viewer.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const [{ unreadCount }] = await db
    .select({ unreadCount: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.memberId, viewer.id), isNull(notifications.readAt)));

  return NextResponse.json({ notifications: rows, unreadCount });
}
