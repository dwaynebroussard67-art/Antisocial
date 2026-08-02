import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteRole, AccessDeniedError } from "@/lib/auth/roles";
import { resolveQuarantine } from "@/lib/moderation/nura";

/**
 * A human resolving one of Nura's Band B holds.
 *
 * Moderator or admin only. There is deliberately no route anywhere that
 * lets the author of held content reach this — the sender is never told a
 * hold exists (HANDOFF-36), so they have nothing to appeal to.
 */

const bodySchema = z.object({
  decision: z.enum(["release", "uphold"]),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let viewer;
  try {
    viewer = await requireSiteRole("moderator");
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.reason }, { status: err.reason === "unauthenticated" ? 401 : 403 });
    }
    throw err;
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await resolveQuarantine({
      quarantineId: params.id,
      reviewerId: viewer.id,
      decision: parsed.data.decision,
      notes: parsed.data.notes,
    });
  } catch (err) {
    console.error("[moderation:resolve] failed", err);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
