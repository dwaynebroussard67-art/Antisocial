import { HeroBoard } from "@/components/HeroBoard";
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
      {/* The form asks for a visibility setting and an invite list with no
          explanation of what either one costs. This says it before they
          commit. */}
      <HeroBoard
        kicker="New Room"
        headline="A room only holds who you put in it."
        body="Rooms don't get discovered, suggested, or recommended to anyone. There's no directory. The only way somebody ends up here is that you invited them or they knocked and you said yes."
        steps={[
          {
            title: "Name it",
            body: "Only the people in the room ever see the name. It isn't listed anywhere public.",
          },
          {
            title: "Choose who it's open to",
            body: "You can keep it to people at your level or below. Nobody above you gets pulled into it.",
          },
          {
            title: "Invite who belongs",
            body: "Nobody is added without you choosing them, and anybody you add can leave without a fuss.",
          },
        ]}
        note="Messages can be set to fade, seal, or burn if they aren't meant to be kept. Nura screens for hate and threats and nothing else."
      />

      <NewRoomForm viewerTier={viewer.tier} />
    </SignalShell>
  );
}
