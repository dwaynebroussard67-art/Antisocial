"use client";
import { useEffect, useState } from "react";
import styles from "./leaderboard-widget.module.css";

type Entry = { memberId: string; name: string; bestScore: number };
type ViewState =
  | { status: "loading" }
  | { status: "ready"; entries: Entry[] }
  | { status: "empty" }
  | { status: "error" };

// Embeddable anywhere on the site — drop in on Street, Block, Crib
// sidebars, etc. Only solo_score games work with this widget this pass;
// head_to_head rating boards ship with the War/Chess sub-piece.
export function ArcadeLeaderboardWidget({ gameKey }: { gameKey: string }) {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/arcade/leaderboard/${gameKey}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setState(data.entries.length === 0 ? { status: "empty" } : { status: "ready", entries: data.entries });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [gameKey]);

  if (state.status === "loading") return <p className={styles.status}>Loading standings…</p>;
  if (state.status === "error") return <p className={styles.status}>Leaderboard unavailable.</p>;
  if (state.status === "empty") return <p className={styles.status}>No scores yet — be the first.</p>;

  return (
    <ol className={styles.list}>
      {state.entries.map((e, i) => (
        <li key={e.memberId} className={styles.row}>
          <span className={styles.rank}>{i + 1}</span>
          <span className={styles.name}>{e.name}</span>
          <span className={styles.value}>{e.bestScore}</span>
        </li>
      ))}
    </ol>
  );
}
