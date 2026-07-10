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
