import Link from "next/link";
import { SignalShell } from "@/components/signal/signal-shell";
import { RoomView } from "@/components/signal/room-view";
import { getSignalViewer } from "@/lib/signal/viewer";
import { getRoom } from "@/lib/signal/service";

export const dynamic = "force-dynamic";

export default async function SignalRoomPage({ params }: { params: { roomId: string } }) {
  const viewer = await getSignalViewer();

  if (!viewer) {
    return (
      <SignalShell title="Signal" subtitle="Sign in to enter rooms.">
        <p style={{ color: "var(--text-secondary)" }}>
          <Link href="/sign-in" style={{ color: "var(--accent-gold)" }}>Sign in</Link> to continue.
        </p>
      </SignalShell>
    );
  }

  const data = await getRoom(viewer, params.roomId);
  if (!data) {
    return (
      <SignalShell title="Not found" subtitle="This room doesn't exist, or its floor is above your tier.">
        <Link href="/signal" style={{ color: "var(--accent-gold)" }}>Back to the board</Link>
      </SignalShell>
    );
  }

  const messages = data.roomMessages.map((m) => ({
    id: m.id,
    senderMemberId: m.senderMemberId,
    kind: m.kind,
    body: m.body,
    voiceUrl: m.voiceUrl,
    transcript: m.transcript,
    visibility: m.visibility,
    witnessMode: m.witnessMode,
    createdAt: (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)).toISOString(),
  }));

  return (
    <SignalShell title={data.room.name} subtitle={`${data.room.type} • trust floor: ${data.room.trustFloor}`}>
      <RoomView roomId={data.room.id} messages={messages} />
    </SignalShell>
  );
}
