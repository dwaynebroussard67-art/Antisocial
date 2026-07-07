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
 */
export async function ensureAnonymousMember(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;

  if (existing) {
    const [row] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.anonymousDeviceId, existing))
      .limit(1);
    if (row) return row.id;
  }

  const deviceId = crypto.randomUUID();
  const [created] = await db
    .insert(members)
    .values({ anonymousDeviceId: deviceId })
    .returning({ id: members.id });

  await db.insert(memberRoles).values({ memberId: created.id, tier: "street" });

  cookieStore.set(COOKIE_NAME, deviceId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 2, // 2 years — Street identity should persist
  });

  return created.id;
}
