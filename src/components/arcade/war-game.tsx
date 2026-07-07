"use client";
import { useCallback, useState } from "react";
import { usePolling } from "@/hooks/use-polling";
import styles from "./war-game.module.css";

type WarState = {
  deckA: { rank: number; suit: string }[];
  deckB: { rank: number; suit: string }[];
  round: number;
  log: string[];
  winnerId: "A" | "B" | "draw" | null;
};

type Match = { id: string; playerAId: string; playerBId: string; state: WarState; status: string; winnerId: string | null };

const RANK_LABEL: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
function labelFor(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

export function WarGame({ viewerId }: { viewerId: string }) {
  const [phase, setPhase] = useState<"idle" | "queued" | "in_match">("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetcher = useCallback(async () => {
    if (!matchId) return null;
    const res = await fetch(`/api/arcade/matches/${matchId}`);
    if (!res.ok) throw new Error();
    return (await res.json()).match as Match;
  }, [matchId]);

  const { data: match, error } = usePolling(fetcher, 1500, (m) => m?.status === "completed");

  async function joinQueue() {
    setBusy(true);
    try {
      const res = await fetch("/api/arcade/games/war/join", { method: "POST" });
      const data = await res.json();
      if (data.status === "matched") {
        setMatchId(data.matchId);
        setPhase("in_match");
      } else {
        setPhase("queued");
      }
    } finally {
      setBusy(false);
    }
  }

  async function leaveQueue() {
    await fetch("/api/arcade/games/war/leave-queue", { method: "POST" });
    setPhase("idle");
  }

  async function playRound() {
    if (!matchId || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/arcade/matches/${matchId}/move`, { method: "POST" });
    } finally {
      setBusy(false);
    }
  }

  if (phase === "idle") {
    return (
      <div className={styles.card}>
        <p className={styles.status}>Head-to-head War. Winner takes it, ratings update after.</p>
        <button className={styles.joinBtn} onClick={joinQueue} disabled={busy}>
          {busy ? "…" : "Find an opponent"}
        </button>
      </div>
    );
  }

  if (phase === "queued") {
    return (
      <div className={styles.card}>
        <p className={styles.status}>Waiting for an opponent in your division…</p>
        <button className={styles.leaveBtn} onClick={leaveQueue}>Cancel</button>
      </div>
    );
  }

  if (error) return <p className={styles.status}>{error}</p>;
  if (!match) return <p className={styles.status}>Loading match…</p>;

  const { state } = match;
  const isViewerA = match.playerAId === viewerId;
  const myDeck = isViewerA ? state.deckA : state.deckB;
  const oppDeck = isViewerA ? state.deckB : state.deckA;
  const myLetter = isViewerA ? "A" : "B";

  return (
    <div className={styles.card}>
      <div className={styles.decks}>
        <div className={styles.deckColumn}>
          <span className={styles.deckLabel}>Your deck</span>
          <span className={styles.deckCount}>{myDeck.length}</span>
        </div>
        <div className={styles.deckColumn}>
          <span className={styles.deckLabel}>Opponent</span>
          <span className={styles.deckCount}>{oppDeck.length}</span>
        </div>
      </div>

      {match.status === "completed" ? (
        <p className={styles.resultBanner}>
          {state.winnerId === "draw"
            ? "Draw."
            : state.winnerId === myLetter
            ? "You win!"
            : "You lose."}
        </p>
      ) : (
        <button className={styles.joinBtn} onClick={playRound} disabled={busy}>
          {busy ? "…" : "Play round"}
        </button>
      )}

      <ul className={styles.log}>
        {state.log.slice(-8).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
