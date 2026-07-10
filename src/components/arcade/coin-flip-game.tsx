"use client";
import { useState } from "react";
import styles from "./solo-games.module.css";

type Last = { result: "heads" | "tails"; won: boolean; endedStreak: number } | null;

/**
 * Coin Flip Streak. The SERVER flips (see api/arcade/games/coin-flip-streak/
 * flip) — the client only carries the running streak. On a loss, the route
 * records the streak you just lost as your score, so the leaderboard is
 * "longest streak survived."
 */
export function CoinFlipGame() {
  const [streak, setStreak] = useState(0);
  const [last, setLast] = useState<Last>(null);
  const [busy, setBusy] = useState(false);

  async function flip(guess: "heads" | "tails") {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/arcade/games/coin-flip-streak/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess, currentStreak: streak }),
      });
      if (!res.ok) return;
      const data: { result: "heads" | "tails"; won: boolean; newStreak: number } = await res.json();
      setLast({ result: data.result, won: data.won, endedStreak: streak });
      setStreak(data.newStreak);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.hint}>Call it. Every right call builds the streak — one wrong call ends it.</p>
      <p className={styles.big} style={{ letterSpacing: "0.1em" }}>
        Streak: {streak}
      </p>
      <div className={styles.row}>
        <button className={styles.btn} onClick={() => flip("heads")} disabled={busy}>
          Heads
        </button>
        <button className={styles.btn} onClick={() => flip("tails")} disabled={busy}>
          Tails
        </button>
      </div>
      {last && (
        <p className={last.won ? styles.good : styles.bad}>
          It was {last.result}.{" "}
          {last.won
            ? "Called it."
            : last.endedStreak > 0
              ? `Streak of ${last.endedStreak} is on the board.`
              : "Fresh start."}
        </p>
      )}
    </div>
  );
}
