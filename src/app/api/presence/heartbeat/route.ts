import { NextResponse } from "next/server";
import { requireStreetAccess, AccessDeniedError } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { memberPresence } from "@/lib/db/schema/notifications";

// PORTED from salvage. Client should ping this periodically (e.g. every 60s
// while a tab is active) — "online now" reads off freshness of lastSeenAt
// rather than a boolean.
//
// FLOOR LOWERED to Street (D's correction, this session). This was
// requireBlockAccess, which meant no Street member ever had a presence row.
// Two things broke because of it:
//   1. The Street's own presence was invisible to the Block, Crib and Pit,
//      even though everything above a tier sees that tier in full.
//   2. The new one-level-up peek had nothing to show a Street viewer's
//      upstairs board... and worse, would have shown Block members as
//      permanently "away" since only Block+ was beating.
// A viewer is still required — anonymous Street visitors have a member row
// (see auth/anonymous-identity.ts), so they beat too; a visitor with no row
// at all has nothing to record and gets a 401.
export async function POST() {
  let viewer;
  try {
    viewer = (await requireStreetAccess()).viewer;
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
