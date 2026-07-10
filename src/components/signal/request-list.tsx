"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./signal.module.css";

type RequestItem = {
  id: string;
  type: string;
  status: string;
  prompt: string | null;
  createdAt: Date | string;
};

export function RequestList({ requests }: { requests: RequestItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "accept" | "reject") {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/signal/requests/${id}/${action}`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return <div className={styles.empty}>No requests waiting. The porch is quiet.</div>;
  }

  return (
    <>
      {requests.map((req) => (
        <div key={req.id} className={styles.card}>
          <div className={styles.rowBetween}>
            <div>
              <div className={styles.roomName}>{req.type.replace(/-/g, " ")}</div>
              <div className={styles.dim}>{new Date(req.createdAt).toLocaleString()}</div>
            </div>
            <div className={styles.meta}>{req.status}</div>
          </div>
          {req.prompt ? <p className={styles.msgBody}>{req.prompt}</p> : null}
          {req.status === "pending" ? (
            <div className={styles.markRow}>
              <button className={styles.actionBtn} disabled={busyId === req.id} onClick={() => act(req.id, "accept")}>
                Open the door
              </button>
              <button className={styles.actionBtn} disabled={busyId === req.id} onClick={() => act(req.id, "reject")}>
                Not now
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}
