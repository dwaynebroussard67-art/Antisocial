"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The two buttons that end a hold.
 *
 * Release puts the content back where it belongs — visible, counted, and
 * (for Signal) its room surfacing normally again. Uphold leaves it held.
 * Neither one notifies the author: from their side nothing ever happened,
 * which is the whole point of the silent hold.
 */
export function ReviewForm({ quarantineId }: { quarantineId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<"release" | "uphold" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(decision: "release" | "uphold") {
    if (pending) return;
    setPending(decision);
    setError(null);
    try {
      const res = await fetch(`/api/moderation/quarantine/${quarantineId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: notes.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't save that. Nothing was changed.");
        setPending(null);
        return;
      }
      router.push("/moderation/quarantine");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Nothing was changed.");
      setPending(null);
    }
  }

  const buttonBase: React.CSSProperties = {
    padding: "0.7rem 1.4rem",
    borderRadius: "var(--radius-lg, 10px)",
    border: "1px solid var(--border, #333)",
    cursor: pending ? "wait" : "pointer",
    fontSize: "0.9rem",
    background: "transparent",
    color: "inherit",
  };

  return (
    <div style={{ display: "grid", gap: "0.9rem" }}>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #999)" }}>
          Notes (optional — recorded in the audit log, never shown to the author)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          style={{
            width: "100%",
            padding: "0.6rem 0.75rem",
            borderRadius: "var(--radius-lg, 10px)",
            border: "1px solid var(--border, #333)",
            background: "var(--surface-1, #0f0f0f)",
            color: "inherit",
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
      </label>

      {error && <p style={{ color: "var(--accent-danger, #d66)", margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <button
          onClick={() => resolve("release")}
          disabled={pending !== null}
          style={{ ...buttonBase, borderColor: "var(--accent-gold, #d4af37)" }}
        >
          {pending === "release" ? "Releasing…" : "Release — this is fine"}
        </button>
        <button
          onClick={() => resolve("uphold")}
          disabled={pending !== null}
          style={{ ...buttonBase }}
        >
          {pending === "uphold" ? "Upholding…" : "Uphold — keep it held"}
        </button>
      </div>
    </div>
  );
}
