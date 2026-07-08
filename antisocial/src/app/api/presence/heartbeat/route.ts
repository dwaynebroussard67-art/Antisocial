import { NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { memberPresence } from "@/lib/db/schema/notifications";

// PORTED from salvage, unchanged in logic. Client should ping this
// periodically (e.g. every 60s while a tab is active) — "online now" reads
// off freshness of lastSeenAt rather than a boolean.
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
    .insert(memberPresence)
    .values({ memberId: viewer.id, lastSeenAt: new Date() })
    .onConflictDoUpdate({ target: memberPresence.memberId, set: { lastSeenAt: new Date() } });

  return NextResponse.json({ status: "ok" });
}
