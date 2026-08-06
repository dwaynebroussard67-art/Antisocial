import { HeroBoard } from "@/components/HeroBoard";
import Link from "next/link";
import { SignalShell } from "@/components/signal/signal-shell";
import { RequestList } from "@/components/signal/request-list";
import { getSignalViewer } from "@/lib/signal/viewer";
import { listRequests } from "@/lib/signal/service";
import styles from "@/components/signal/signal.module.css";

export const dynamic = "force-dynamic";

export default async function FrontPorchPage() {
  const viewer = await getSignalViewer();

  if (!viewer) {
    return (
      <SignalShell title="Front Porch" subtitle="Where requests wait until you open the door." active="porch">
        <p style={{ color: "var(--text-secondary)" }}>
          <Link href="/sign-in" style={{ color: "var(--accent-gold)" }}>Sign in</Link> to see who&apos;s knocking.
        </p>
      </SignalShell>
    );
  }

  const requests = await listRequests(viewer);

  return (
    <SignalShell
      title="Front Porch"
      subtitle="Nobody gets a thread with you until you say so. These are the knocks."
      active="porch"
    >
      {/* "Knock" is our word, not a word anyone arrives already knowing.
          Without this, the button is a verb nobody can predict the
          consequences of pressing. */}
      <HeroBoard
        kicker="Front Porch"
        headline="This is where you ask, and where you get asked."
        body="Nobody can start a conversation with you here without knocking first. A knock is just a request with a short note saying who you are and why — it opens nothing until you answer it."
        steps={[
          {
            title: "Knock on somebody's door",
            body: "Say who you are and why you're reaching out. They'll see the note before they decide.",
          },
          {
            title: "They answer, or they don't",
            body: "No is a complete answer. It closes quietly — they don't have to explain, and nothing is held against anyone.",
          },
          {
            title: "Yes opens a room",
            body: "Only then can either of you message. The room exists because both people agreed to it.",
          },
        ]}
        note="An unanswered knock isn't a rejection. People here are carrying things. Silence is allowed."
      />

      <Link href="/signal/front-porch/new" className={styles.newLink}>+ Knock</Link>
      <RequestList
        requests={requests.map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          prompt: r.prompt,
          createdAt: r.createdAt,
        }))}
      />
    </SignalShell>
  );
}
