import { useEffect, useMemo, useRef, useState } from "react";
import { GameEngine, EngineSnapshot } from "../game/engine";
import type { Dir } from "../game/types";

const KEY_MAP: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

export function useGameEngine(baseSpeed: number, ghostSpeed: number) {
  const engine = useMemo(() => new GameEngine({ baseSpeed, ghostSpeed, lives: 3 }), []);
  const engineRef = useRef(engine);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(engine.getSnapshot());

  // main simulation loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      engineRef.current.tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // hud polling loop (lighter weight than a state update every animation frame)
  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot(engineRef.current.getSnapshot());
    }, 90);
    return () => clearInterval(id);
  }, []);

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        engineRef.current.setDirection(dir);
      } else if (e.key === " " || e.key === "Escape" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        engineRef.current.togglePause();
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { engineRef, snapshot };
}
