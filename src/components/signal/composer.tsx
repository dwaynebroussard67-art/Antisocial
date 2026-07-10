"use client";
import { useState } from "react";
import styles from "./signal.module.css";

const KINDS = ["text", "burn", "pulse", "check-in"] as const;
type Kind = (typeof KINDS)[number];
type Visibility = "keep" | "fade" | "seal" | "burn";

export function Composer({
  onSend,
}: {
  onSend: (payload: { kind: Kind; body: string; visibility: Visibility; witnessMode: boolean }) => Promise<string | null>;
}) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("keep");
  const [witnessMode, setWitnessMode] = useState(false);
  const [kind, setKind] = useState<Kind>("text");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = body.trim();
    if (!text || pending) return;
    setPending(true);
    setError(null);
    try {
      const err = await onSend({ kind, body: text, visibility, witnessMode });
      if (err) setError(err);
      else setBody("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.composer}>
      <div className={styles.kindRow}>
        {KINDS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`${styles.kindBtn} ${kind === value ? styles.kindBtnActive : ""}`}
          >
            {value}
          </button>
        ))}
      </div>
      <textarea
        className={styles.textarea}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Send a signal…"
      />
      <div className={styles.controls}>
        <label className={styles.checkbox}>
          Visibility
          <select className={styles.select} value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            <option value="keep">Keep</option>
            <option value="fade">Fade</option>
            <option value="seal">Seal</option>
            <option value="burn">Burn</option>
          </select>
        </label>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={witnessMode} onChange={(e) => setWitnessMode(e.target.checked)} />
          Witness mode
        </label>
        <button className={styles.sendBtn} onClick={send} disabled={pending || !body.trim()}>
          {pending ? "…" : "Send"}
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
