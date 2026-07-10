import { NextResponse } from "next/server";
import { z } from "zod";
import { getSignalViewer } from "@/lib/signal/viewer";
import { createRoom, listSignalBoard } from "@/lib/signal/service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  type: z.enum(["direct", "group", "protected", "mission", "prayer", "witness", "pit-watch"]),
  trustFloor: z.enum(["street", "block", "crib", "pit"]),
  memberIds: z.array(z.string().uuid()).optional(),
  witnessDefault: z.boolean().optional(),
});

export async function GET() {
  const viewer = await getSignalViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const rooms = await listSignalBoard(viewer);
  return NextResponse.json({ rooms });
}

export async function POST(req: Request) {
  const viewer = await getSignalViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    const room = await createRoom({ viewer, ...parsed.data, memberIds: parsed.data.memberIds ?? [] });
    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
