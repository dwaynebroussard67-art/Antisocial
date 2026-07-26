import { NextResponse } from "next/server";
import { requireStreetAccess, AccessDeniedError } from "@/lib/auth/roles";
import { getUpstairsPresence } from "@/lib/tiers/peek-presence";

export const dynamic = "force-dynamic";

/**
 * The one-level-up peek, as JSON, for clients that want to poll it rather
 * than take the server-rendered <UpstairsPresence/> board.
 *
 * Street floor: every tier gets a peek at the floor above it, so this is
 * open to everyone. What comes back is scoped by the CALLER's tier, never
 * by a query parameter — there is deliberately no way to ask this route
 * about a tier of your choosing. `rows` carries display names and an active
 * flag and no member ids, so a client holding this response still cannot
 * address anybody upstairs.
 *
 * Pit callers get `{ upstairs: null }` — nothing sits above the Pit.
 */
export async function GET() {
  let tier;
  try {
    ({ tier } = await requireStreetAccess());
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.reason }, { status: 401 });
    }
    throw err;
  }

  try {
    const peek = await getUpstairsPresence(tier);
    if (!peek) return NextResponse.json({ upstairs: null });

    return NextResponse.json({
      upstairs: {
        tier: peek.tier,
        activeCount: peek.rows.filter((r) => r.active).length,
        rows: peek.rows,
      },
    });
  } catch (err) {
    console.error("[presence/upstairs:GET]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
