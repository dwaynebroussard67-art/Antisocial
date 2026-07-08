import { NextRequest, NextResponse } from "next/server";
import { requireCribAccess, AccessDeniedError } from "@/lib/auth/roles";
import { completeProject, WorkshopError } from "@/lib/workshop/volunteers";

// PORTED from salvage. requireHouseAccess -> requireCribAccess (tier rename).
// Gated to Crib+: marking a project complete triggers real badge awards to
// every active volunteer — this should not be an open-member action.

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireCribAccess();
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 403 });
    throw err;
  }

  try {
    await completeProject(params.id);
    return NextResponse.json({ status: "completed" });
  } catch (err) {
    if (err instanceof WorkshopError) return NextResponse.json({ error: err.code }, { status: 404 });
    console.error("[workshop/complete:POST]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
