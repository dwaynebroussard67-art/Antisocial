import Link from "next/link";
import { SignalShell } from "@/components/signal/signal-shell";
import { RoomList } from "@/components/signal/room-list";
import { getSignalViewer } from "@/lib/signal/viewer";
import { listSignalBoard } from "@/lib/signal/service";

export const dynamic = "force-dynamic";

export default async function SignalBoardPage() {
  const viewer = await getSignalViewer();

  if (!viewer) {
    return (
      <SignalShell
        title="Signal"
        subtitle="Consent-first messaging for the Block. Nobody reaches you without knocking first."
        active="board"
      >
        <p style={{ color: "var(--text-secondary)" }}>
          <Link href="/sign-in" style={{ color: "var(--accent-gold)" }}>Sign in</Link> to see your rooms.
        </p>
      </SignalShell>
    );
  }

  const rooms = await listSignalBoard(viewer);

  return (
    <SignalShell
      title="Signal Board"
      subtitle="Your rooms. Every one of them exists because somebody said yes."
      active="board"
    >
      <RoomList rooms={rooms} />
    </SignalShell>
  );
}
