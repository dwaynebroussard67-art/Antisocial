import { NextResponse } from "next/server";
import { z } from "zod";
import { getSignalViewer } from "@/lib/signal/viewer";
import { getRoom, sendSignalMessage, addMark } from "@/lib/signal/service";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  kind: z.enum(["text", "voice", "image", "video", "burn", "pulse", "check-in", "mark"]).optional(),
  body: z.string().max(4000).nullable().optional(),
  voiceUrl: z.string().url().nullable().optional(),
  transcript: z.string().max(4000).nullable().optional(),
  visibility: z.enum(["keep", "fade", "seal", "burn"]).optional(),
  witnessMode: z.boolean().optional(),
  parentMessageId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const markSchema = z.object({
  markMessageId: z.string().uuid(),
  mark: z.enum(["heard", "with-you", "praying", "solid", "check-in"]),
});

export async function GET(_: Request, { params }: { params: { roomId: string } }) {
  const viewer = await getSignalViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const data = await getRoom(viewer, params.roomId);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: { roomId: string } }) {
  const viewer = await getSignalViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);

  // Mark reactions share the room endpoint: { markMessageId, mark }.
  const asMark = markSchema.safeParse(body);
  if (asMark.success) {
    await addMark({ viewer, messageId: asMark.data.markMessageId, mark: asMark.data.mark });
    return NextResponse.json({ ok: true });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    const message = await sendSignalMessage({
      viewer,
      roomId: params.roomId,
      kind: parsed.data.kind,
      body: parsed.data.body ?? null,
      voiceUrl: parsed.data.voiceUrl ?? null,
      transcript: parsed.data.transcript ?? null,
      visibility: parsed.data.visibility,
      witnessMode: parsed.data.witnessMode,
      parentMessageId: parsed.data.parentMessageId ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
