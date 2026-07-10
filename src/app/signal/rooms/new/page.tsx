import Link from "next/link";
import { SignalShell } from "@/components/signal/signal-shell";
import { NewRoomForm } from "@/components/signal/new-room-form";
import { getSignalViewer } from "@/lib/signal/viewer";

export const dynamic = "force-dynamic";

export default async function NewRoomPage() {
  const viewer = await getSignalViewer();

  if (!viewer) {
    return (
      <SignalShell title="New Room" subtitle="Sign in first." active="board">
        <p style={{ color: "var(--text-secondary)" }}>
          <Link href="/sign-in" style={{ color: "var(--accent-gold)" }}>Sign in</Link> to create a room.
        </p>
      </SignalShell>
    );
  }

  return (
    <SignalShell
      title="New Room"
      subtitle="Name it, set who it's open to, and invite whoever belongs in it. Nobody gets added without you choosing them."
      active="board"
    >
      <NewRoomForm viewerTier={viewer.tier} />
    </SignalShell>
  );
}
