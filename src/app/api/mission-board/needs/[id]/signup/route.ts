import { NextRequest, NextResponse } from "next/server";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { signUpForNeed, cancelSignup, MissionBoardError } from "@/lib/mission-board/signup";

// PORTED from salvage, unchanged logic (Block-tier gate on the signup
// action itself, distinct from the Crib-tier gate on creating the need).

const STATUS_BY_CODE: Record<MissionBoardError["code"], number> = {
  not_found: 404,
  closed: 409,
  past_deadline: 409,
  full: 409,
  already_signed_up: 409,
};

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  let viewer;
  try {
    viewer = (await requireBlockAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) return NextResponse.json({ error: err.reason }, { status: 401 });
    throw err;
  }

  try {
    await signUpForNeed(params.id, viewer.id);
    return NextResponse.json({ status: "signed_up" }, { status: 201 });
  } catch (err) {
    if (err instanceof MissionBoardError) {
      return NextResponse.json({ error: err.code }, { status: STATUS_BY_CODE[err.code] });
    }
    console.error("[mission-board/signup:POST]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
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
    await cancelSignup(params.id, viewer.id);
    return NextResponse.json({ status: "cancelled" });
  } catch (err) {
    if (err instanceof MissionBoardError) {
      return NextResponse.json({ error: err.code }, { status: STATUS_BY_CODE[err.code] });
    }
    console.error("[mission-board/signup:DELETE]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
