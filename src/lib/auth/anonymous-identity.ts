import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "antisocial_anon_id";

/**
 * Ensures every visitor — even one who declines to give an email — has a
 * stable member row. This is what makes "they get regulated to Street" a
 * real, persistent state rather than a session-only illusion: a Street
 * visitor who comes back tomorrow is still recognized, still has their
 * game history, still gets loved on by Nura the same way.
 *
 * Call this on first load of any Antisocial page BEFORE checking tier.
 *
 * BUGFIX (this session): this function used to call `cookieStore.set(...)`
 * directly, but it's called from `AntisocialGate` — an async Server
 * Component (src/app/page.tsx). Next.js only allows writing cookies from
 * a Server Action or Route Handler, so that `.set()` call threw "Cookies
 * can only be modified in a Server Action or Route Handler" on every
 * brand-new visitor's first page load — the homepage crashed for anyone
 * without the cookie already set. The device-id cookie is now assigned by
 * src/middleware.ts (which runs before this, and is allowed to write
 * cookies) — by the time this function runs, the cookie is guaranteed to
 * already be on the request. This function now only reads it and creates
 * the matching DB row; it never writes the cookie itself.
 */
export async function ensureAnonymousMember(): Promise<string> {
  const cookieStore = await cookies();
  const deviceId = cookieStore.get(COOKIE_NAME)?.value;

  if (!deviceId) {
    // Should not happen — middleware assigns this cookie on every request
    // that reaches a page. Fail loudly instead of silently creating a
    // member with no device id to recognize them by next time.
    throw new Error(
      "ensureAnonymousMember: no antisocial_anon_id cookie on the request. " +
        "Is src/middleware.ts's matcher excluding this route?"
    );
  }

  const [row] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.anonymousDeviceId, deviceId))
    .limit(1);
  if (row) return row.id;

  const [created] = await db
    .insert(members)
    .values({ anonymousDeviceId: deviceId })
    .returning({ id: members.id });

  await db.insert(memberRoles).values({ memberId: created.id, tier: "street" });

  return created.id;
}
