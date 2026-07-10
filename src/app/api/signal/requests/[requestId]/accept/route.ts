import { NextResponse } from "next/server";
import { getSignalViewer } from "@/lib/signal/viewer";
import { acceptRequest } from "@/lib/signal/service";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { requestId: string } }) {
  const viewer = await getSignalViewer();
  if (!viewer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const request = await acceptRequest(viewer, params.requestId);
    return NextResponse.json({ request });
  } catch (err) {
    const msg = (err as Error).message;
    return NextResponse.json({ error: msg }, { status: msg === "Request not found" ? 404 : 403 });
  }
}
