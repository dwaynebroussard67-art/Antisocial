import { useEffect, useRef } from "react";
import { useGameEngine } from "../hooks/useGameEngine";
import { entityRenderPos, COLS, ROWS } from "../game/engine";
import type { LevelTheme } from "../game/themes";
import HUD from "./HUD";
import TouchControls from "./TouchControls";
import type { Dir } from "../game/types";

interface Props {
  theme: LevelTheme;
  onExit: () => void;
  onCleared?: () => void;
}

const DIR_ANGLE: Record<Dir, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
  none: 0,
};

export default function ClassicLevel({ theme, onExit, onCleared }: Props) {
  const { engineRef, snapshot } = useGameEngine(165, 195);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef(28);

  useEffect(() => {
    if (snapshot.status === "levelclear") onCleared?.();
  }, [snapshot.status, onCleared]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const cell = Math.floor(Math.min(w / COLS, h / ROWS));
      cellRef.current = Math.max(cell, 10);
      canvas.width = cellRef.current * COLS * dpr;
      canvas.height = cellRef.current * ROWS * dpr;
      canvas.style.width = `${cellRef.current * COLS}px`;
      canvas.style.height = `${cellRef.current * ROWS}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    const draw = () => {
      const engine = engineRef.current;
      const now = performance.now();
      const cell = cellRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, cell * COLS, cell * ROWS);

      // maze walls
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const type = engine.grid[r][c];
          const x = c * cell;
          const y = r * cell;
          if (type === "wall") {
            ctx.fillStyle = theme.colors.wall;
            const pad = cell * 0.09;
            ctx.beginPath();
            const rr = cell * 0.28;
            const x0 = x + pad,
              y0 = y + pad,
              w0 = cell - pad * 2,
              h0 = cell - pad * 2;
            ctx.moveTo(x0 + rr, y0);
            ctx.arcTo(x0 + w0, y0, x0 + w0, y0 + h0, rr);
            ctx.arcTo(x0 + w0, y0 + h0, x0, y0 + h0, rr);
            ctx.arcTo(x0, y0 + h0, x0, y0, rr);
            ctx.arcTo(x0, y0, x0 + w0, y0, rr);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = theme.colors.wallEmissive;
            ctx.lineWidth = Math.max(1, cell * 0.04);
            ctx.stroke();
          } else if (type === "dot") {
            ctx.fillStyle = theme.colors.dot;
            ctx.beginPath();
            ctx.arc(x + cell / 2, y + cell / 2, cell * 0.08, 0, Math.PI * 2);
            ctx.fill();
          } else if (type === "pellet") {
            const pulse = 0.75 + 0.25 * Math.sin(now / 130);
            ctx.fillStyle = theme.colors.pellet;
            ctx.beginPath();
            ctx.arc(x + cell / 2, y + cell / 2, cell * 0.24 * pulse, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // player
      const p = engine.player;
      const ppos = entityRenderPos(p, now);
      const px = (ppos.col + 0.5) * cell;
      const py = (ppos.row + 0.5) * cell;
      const moving = p.dir !== "none" && engine.status === "playing";
      const mouth = moving ? 0.12 + 0.22 * Math.abs(Math.sin(now / 100)) : 0.02;
      const angle = DIR_ANGLE[p.dir === "none" ? "right" : p.dir];
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, cell * 0.42, mouth * Math.PI, Math.PI * 2 - mouth * Math.PI);
      ctx.closePath();
      ctx.fillStyle = theme.colors.player;
      ctx.shadowColor = theme.colors.player;
      ctx.shadowBlur = cell * 0.3;
      ctx.fill();
      ctx.restore();

      // ghosts
      for (const g of engine.ghosts) {
        const gpos = entityRenderPos(g, now);
        const gx = (gpos.col + 0.5) * cell;
        const gy = (gpos.row + 0.5) * cell;
        const r = cell * 0.42;
        let color = theme.colors.ghosts[g.id % 4];
        let scared = false;
        if (g.mode === "frightened") {
          scared = true;
          const flashing = engine.frightenedUntil - engine.clock < 1500;
          color =
            flashing && Math.floor(now / 150) % 2 === 0
              ? theme.colors.frightenedFlash
              : theme.colors.frightened;
        }
        if (g.mode === "eaten") {
          // just eyes
          drawEyes(ctx, gx, gy, r, g.dir);
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(gx - r, gy + r * 0.55);
        ctx.arc(gx, gy, r, Math.PI, 0, false);
        ctx.lineTo(gx + r, gy + r * 0.55);
        const waves = 4;
        const waveW = (2 * r) / waves;
        for (let i = 0; i < waves; i++) {
          const xStart = gx + r - waveW * i;
          const xMid = xStart - waveW / 2;
          const xEnd = xStart - waveW;
          const yTop = gy + r * 0.55;
          const yBottom = gy + r * 1.0;
          ctx.quadraticCurveTo(xMid, i % 2 === 0 ? yBottom : yTop, xEnd, yTop);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        if (scared) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = Math.max(1, cell * 0.03);
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const x0 = gx - r * 0.5 + i * (r / 2.2);
            ctx.moveTo(x0, gy - r * 0.1);
            ctx.lineTo(x0 + r / 4.4, gy + r * 0.1);
          }
          ctx.stroke();
        } else {
          drawEyes(ctx, gx, gy, r, g.dir);
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme]);

  function handleDir(d: Dir) {
    engineRef.current.setDirection(d);
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-black">
      <div ref={wrapRef} className="relative flex flex-1 items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="rounded-md shadow-[0_0_40px_rgba(37,37,255,0.35)]" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.18) 3px)",
            mixBlendMode: "multiply",
          }}
        />
      </div>
      <HUD
        theme={theme}
        snapshot={snapshot}
        onExit={onExit}
        onRestart={() => engineRef.current.reset()}
        onPause={() => engineRef.current.togglePause()}
      />
      <TouchControls onDirection={handleDir} accent={theme.colors.hudAccent} />
    </div>
  );
}

function drawEyes(ctx: CanvasRenderingContext2D, gx: number, gy: number, r: number, dir: Dir) {
  const off = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, none: { x: 0, y: 0 } }[dir];
  const eyeOffsetX = r * 0.35;
  const eyeY = gy - r * 0.15;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(gx - eyeOffsetX, eyeY, r * 0.22, r * 0.26, 0, 0, Math.PI * 2);
  ctx.ellipse(gx + eyeOffsetX, eyeY, r * 0.22, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a2b6b";
  const pupilOff = r * 0.1;
  ctx.beginPath();
  ctx.arc(gx - eyeOffsetX + off.x * pupilOff, eyeY + off.y * pupilOff, r * 0.11, 0, Math.PI * 2);
  ctx.arc(gx + eyeOffsetX + off.x * pupilOff, eyeY + off.y * pupilOff, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
}
