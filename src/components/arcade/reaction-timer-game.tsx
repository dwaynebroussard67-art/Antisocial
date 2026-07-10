"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./solo-games.module.css";

type Phase =
  | { name: "idle" }
  | { name: "waiting" } // armed — gold is coming, don't tap yet
  | { name: "go"; shownAt: number }
  | { name: "result"; ms: number; recorded: boolean }
  | { name: "foul" }; // tapped before gold

/**
 * Reaction Timer. Registry says lower_better; the score IS the reaction in
 * milliseconds, submitted to the shared solo-score route (which the score
 * route's own comments call out as the right home for it — nothing to
 * verify server-side).
 */
export function ReactionTimerGame() {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [best, setBest] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function arm() {
    setPhase({ name: "waiting" });
    const delay = 1500 + Math.random() * 2500; // 1.5s–4s
    timerRef.current = setTimeout(() => {
      setPhase({ name: "go", shownAt: performance.now() });
    }, delay);
  }

  async function tap() {
    if (phase.name === "idle" || phase.name === "result" || phase.name === "foul") {
      arm();
      return;
    }
    if (phase.name === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase({ name: "foul" });
      return;
    }
    // phase.name === "go"
    const ms = Math.max(1, Math.round(performance.now() - phase.shownAt));
    setPhase({ name: "result", ms, recorded: false });
    setBest((b) => (b === null || ms < b ? ms : b));
    try {
      const res = await fetch("/api/arcade/games/reaction_timer/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: ms, metadata: {} }),
      });
      if (res.ok) setPhase({ name: "result", ms, recorded: true });
    } catch {
      /* score stays local-only; pad already shows the time */
    }
  }

  const padClass =
    phase.name === "waiting"
      ? `${styles.pad} ${styles.padWait}`
      : phase.name === "go"
        ? `${styles.pad} ${styles.padGo}`
        : `${styles.pad} ${styles.padIdle}`;

  const padText =
    phase.name === "idle"
      ? "Tap to start"
      : phase.name === "waiting"
        ? "Wait for gold…"
        : phase.name === "go"
          ? "TAP!"
          : phase.name === "foul"
            ? "Too soon. Tap to try again."
            : `${(phase as Extract<Phase, { name: "result" }>).ms} ms — tap to go again`;

  return (
    <div className={styles.card}>
      <p className={styles.hint}>Tap when the pad turns gold — lower is better</p>
      <div className={styles.row}>
        <button className={padClass} onClick={tap}>
          {padText}
        </button>
      </div>
      {phase.name === "result" && (
        <p className={phase.recorded ? styles.good : styles.meta}>
          {phase.recorded ? "On the board." : "Recording…"}
        </p>
      )}
      {best !== null && <p className={styles.meta}>Best this sitting: {best} ms</p>}
    </div>
  );
}
