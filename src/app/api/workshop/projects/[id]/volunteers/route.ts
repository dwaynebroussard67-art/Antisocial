import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { joinProject, leaveProject, WorkshopError } from "@/lib/workshop/volunteers";
import { z } from "zod";

// PORTED from salvage, unchanged logic. Any Block+ member can join/leave a
// project's volunteer roster; only Crib+ can mark it complete (see
// [id]/complete/route.ts).

const joinSchema = z.object({ role: z.string().trim().max(60).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  const parsed = joinSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    await joinProject(params.id, viewer.id, parsed.data.role);
    return NextResponse.json({ status: "joined" }, { status: 201 });
  } catch (err) {
    if (err instanceof WorkshopError) return NextResponse.json({ error: err.code }, { status: 409 });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  try {
    await leaveProject(params.id, viewer.id);
    return NextResponse.json({ status: "left" });
  } catch (err) {
    if (err instanceof WorkshopError) return NextResponse.json({ error: err.code }, { status: 409 });
    throw err;
  }
}
