import Link from "next/link";
import { SignalShell } from "@/components/signal/signal-shell";
import { KnockForm } from "@/components/signal/knock-form";
import { getSignalViewer } from "@/lib/signal/viewer";

export const dynamic = "force-dynamic";

export default async function NewKnockPage() {
  const viewer = await getSignalViewer();

  if (!viewer) {
    return (
      <SignalShell title="Knock" subtitle="Sign in first." active="porch">
        <p style={{ color: "var(--text-secondary)" }}>
          <Link href="/sign-in" style={{ color: "var(--accent-gold)" }}>Sign in</Link> to knock on someone's door.
        </p>
      </SignalShell>
    );
  }

  return (
    <SignalShell
      title="Knock"
      subtitle="A knock isn't a thread. It sits on their porch until they open the door."
      active="porch"
    >
      <KnockForm />
    </SignalShell>
  );
}
