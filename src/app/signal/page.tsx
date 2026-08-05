import Link from "next/link";
import { SignalShell } from "@/components/signal/signal-shell";
import { HeroBoard } from "@/components/HeroBoard";
import { RoomList } from "@/components/signal/room-list";
import { getSignalViewer } from "@/lib/signal/viewer";
import { listSignalBoard } from "@/lib/signal/service";
import styles from "@/components/signal/signal.module.css";

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
        {/* A stranger arriving here has never heard of Signal. "Sign in to
            see your rooms" asked them to want something nobody had told
            them about yet. */}
        <HeroBoard
          kicker="Signal"
          headline="Nobody reaches you without knocking first."
          body="Signal is how Misfits actually talk to each other here — not a public feed, not a comment section. Every conversation is a room, and a room only exists because both people agreed to it. Nobody can drop into your messages because they found your name somewhere."
          steps={[
            {
              title: "Somebody knocks",
              body: "A request comes in. You see who it is and why. Nothing opens until you answer it.",
            },
            {
              title: "You say yes or no",
              body: "Say no and it closes — no notification to them, no explanation owed, no hard feelings tracked.",
            },
            {
              title: "The room opens",
              body: "Now you can talk. You can also set a message to fade, seal, or burn if it isn't meant to be kept.",
            },
          ]}
          ctaLabel="Sign in to start"
          ctaHref="/sign-in"
          note="Your email is never shown to other members. Nura watches this space for hate and threats — she doesn't read over your shoulder for anything else."
        />
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
      <Link href="/signal/rooms/new" className={styles.newLink}>+ New Room</Link>
      <RoomList rooms={rooms} />
    </SignalShell>
  );
}
