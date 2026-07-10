"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./signal.module.css";
import { MemberPicker, type PickedMember } from "./member-picker";

/**
 * Front-porch "knock" — a request that only becomes a room if the
 * receiver accepts (see acceptRequest in lib/signal/service.ts). This is
 * the consent-first entry point: nobody gets a thread opened at them.
 */
export function KnockForm() {
  const router = useRouter();
  const [member, setMember] = useState<PickedMember[]>([]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = prompt.trim();
    if (!text || member.length !== 1 || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/signal/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "front-porch",
          toMemberId: member[0].id,
          prompt: text,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't send that knock.");
        return;
      }
      router.push("/signal/front-porch");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.composer}>
      <label className={styles.label}>
        Who are you knocking for
        <MemberPicker selected={member} onChange={setMember} max={1} placeholder="Search by name…" />
      </label>

      <label className={styles.label}>
        What do you want them to know before they open the door
        <textarea
          className={styles.textarea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A short, honest reason. They'll see this before they accept."
        />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.controls}>
        <button
          className={styles.sendBtn}
          onClick={submit}
          disabled={pending || !prompt.trim() || member.length !== 1}
        >
          {pending ? "Knocking…" : "Knock"}
        </button>
      </div>
    </div>
  );
}
