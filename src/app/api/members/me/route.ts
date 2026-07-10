import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";
import { getViewer } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(32, "32 characters max")
    // Letters, numbers, spaces, and a few name-safe marks. No @ so a
    // display name can never masquerade as an email in the picker.
    .regex(/^[A-Za-z0-9 ._'-]+$/, "Letters, numbers, spaces, . _ ' - only"),
});

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const [row] = await db
    .select({
      id: members.id,
      email: members.email,
      displayName: members.displayName,
      createdAt: members.createdAt,
      tier: memberRoles.tier,
      siteRole: memberRoles.siteRole,
    })
    .from(members)
    .innerJoin(memberRoles, eq(memberRoles.memberId, members.id))
    .where(eq(members.id, viewer.id))
    .limit(1);
  return NextResponse.json({ me: row ?? null });
}

export async function PATCH(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid_body" },
      { status: 400 },
    );
  }
  const [updated] = await db
    .update(members)
    .set({ displayName: parsed.data.displayName, updatedAt: new Date() })
    .where(eq(members.id, viewer.id))
    .returning({ displayName: members.displayName });
  return NextResponse.json({ displayName: updated.displayName });
}
