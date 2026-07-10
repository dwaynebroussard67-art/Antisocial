import { NextResponse } from "next/server";
import { and, eq, ilike, ne } from "drizzle-orm";
import { getSignalViewer } from "@/lib/signal/viewer";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";

export const dynamic = "force-dynamic";

/**
 * Member search for the room-creation / knock member picker. Signed-in
 * members only (mirrors every other Signal route), excludes the viewer
 * themselves, and only matches on display name — email is never searchable
 * here, this is a "who do I already know" picker, not a directory lookup
 * that could be used to find someone by email.
 */
export async function GET(req: Request) {
  const viewer = await getSignalViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ members: [] });

  const rows = await db
    .select({
      id: members.id,
      displayName: members.displayName,
      tier: memberRoles.tier,
    })
    .from(members)
    .innerJoin(memberRoles, eq(memberRoles.memberId, members.id))
    .where(
      and(
        ne(members.id, viewer.memberId),
        ilike(members.displayName, `%${q}%`),
      ),
    )
    .limit(10);

  return NextResponse.json({
    members: rows
      .filter((r) => r.displayName)
      .map((r) => ({ id: r.id, displayName: r.displayName as string, tier: r.tier })),
  });
}
