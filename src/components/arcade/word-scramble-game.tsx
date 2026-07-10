"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./solo-games.module.css";

type Round = { scrambled: string; length: number; roundId: string };
type ViewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "playing"; round: Round }
  | { status: "answered"; round: Round; correct: boolean };

/**
 * Word Scramble play surface. The server picks the word and verifies the
 * guess (see api/arcade/games/word-scramble/*) — each correct solve records
 * a score of 1, so the leaderboard is "most words solved."
 */
export function WordScrambleGame() {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [solved, setSolved] = useState(0);

  const loadRound = useCallback(() => {
    setState({ status: "loading" });
    setGuess("");
    fetch("/api/arcade/games/word-scramble/round")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((round: Round) => setState({ status: "playing", round }))
      .catch(() => setState({ status: "error" }));
  }, []);

  useEffect(() => {
    loadRound();
  }, [loadRound]);

  async function submit() {
    if (state.status !== "playing" || busy || !guess.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/arcade/games/word-scramble/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: state.round.roundId, guess: guess.trim() }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.correct) setSolved((n) => n + 1);
      setState({ status: "answered", round: state.round, correct: !!data.correct });
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "loading") return <p className={styles.status}>Shuffling letters…</p>;
  if (state.status === "error") return <p className={styles.status}>Couldn&apos;t load a word right now.</p>;

  return (
    <div className={styles.card}>
      <p className={styles.hint}>Unscramble — {state.round.length} letters</p>
      <p className={styles.big}>{state.round.scrambled}</p>

      {state.status === "playing" ? (
        <div className={styles.row}>
          <input
            className={styles.input}
            value={guess}
            placeholder="Your answer"
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <button className={styles.btn} onClick={submit} disabled={busy || !guess.trim()}>
            {busy ? "…" : "Submit"}
          </button>
        </div>
      ) : (
        <>
          {state.correct ? (
            <p className={styles.good}>Solved. That&apos;s on the board.</p>
          ) : (
            <p className={styles.bad}>Not it — the word was {state.round.roundId.toUpperCase()}.</p>
          )}
          <div className={styles.row}>
            <button className={styles.btnGhost} onClick={loadRound}>
              New word
            </button>
          </div>
        </>
      )}

      {solved > 0 && <p className={styles.meta}>Solved this sitting: {solved}</p>}
    </div>
  );
}
