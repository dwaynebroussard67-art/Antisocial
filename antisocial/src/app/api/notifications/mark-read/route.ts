import { NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema/notifications";
import { eq, and, isNull } from "drizzle-orm";

// PORTED from salvage, unchanged in logic.
export async function POST() {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.memberId, viewer.id), isNull(notifications.readAt)));

  return NextResponse.json({ status: "marked_read" });
}
