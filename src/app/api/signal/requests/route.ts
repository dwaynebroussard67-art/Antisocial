import { NextResponse } from "next/server";
import { z } from "zod";
import { getSignalViewer } from "@/lib/signal/viewer";
import { createFrontPorchRequest, createCheckIn, listRequests } from "@/lib/signal/service";

export const dynamic = "force-dynamic";

const porchSchema = z.object({
  mode: z.literal("front-porch"),
  toMemberId: z.string().uuid(),
  prompt: z.string().min(1).max(500),
  payload: z.record(z.unknown()).optional(),
});

const checkInSchema = z.object({
  mode: z.literal("check-in").optional(),
  toMemberId: z.string().uuid().nullable().optional(),
  kind: z.enum(["okay", "listen", "prayer", "practical-help", "unsafe", "call-me"]),
  prompt: z.string().min(1).max(500),
  payload: z.record(z.unknown()).optional(),
});

export async function GET() {
  const viewer = await getSignalViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const requests = await listRequests(viewer);
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const viewer = await getSignalViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);

  const porch = porchSchema.safeParse(body);
  if (porch.success) {
    const request = await createFrontPorchRequest({
      viewer,
      toMemberId: porch.data.toMemberId,
      prompt: porch.data.prompt,
      payload: porch.data.payload,
    });
    return NextResponse.json({ request }, { status: 201 });
  }

  const checkIn = checkInSchema.safeParse(body);
  if (!checkIn.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const request = await createCheckIn({
    viewer,
    toMemberId: checkIn.data.toMemberId ?? null,
    kind: checkIn.data.kind,
    prompt: checkIn.data.prompt,
    payload: checkIn.data.payload,
  });
  return NextResponse.json({ request }, { status: 201 });
}
