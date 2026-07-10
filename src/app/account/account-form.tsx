"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/components/signal/signal.module.css";

/**
 * Display-name editor. The name is what the Signal member picker searches
 * and what the nav shows — it's how other misfits find and recognize you.
 */
export function AccountForm({ initialName }: { initialName: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (pending) return;
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/members/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error ?? "Couldn't save right now." });
      } else {
        setMsg({ ok: true, text: "Saved. This is the name people can find you by." });
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.card} style={{ display: "grid", gap: 10 }}>
      <label className={styles.label} htmlFor="displayName">Display name</label>
      <input
        id="displayName"
        className={styles.input}
        value={name}
        placeholder="What should the Block call you?"
        maxLength={32}
        onChange={(e) => setName(e.target.value)}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button className={styles.sendBtn} style={{ marginLeft: 0 }} onClick={save} disabled={pending || name.trim().length < 2}>
          {pending ? "…" : "Save"}
        </button>
        {msg ? (
          <span className={msg.ok ? styles.meta : styles.error} style={{ textTransform: "none", letterSpacing: 0 }}>
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
