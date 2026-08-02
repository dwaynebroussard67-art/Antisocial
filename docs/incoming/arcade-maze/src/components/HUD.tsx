import type { LevelTheme } from "../game/themes";
import type { EngineSnapshot } from "../game/engine";

interface Props {
  theme: LevelTheme;
  snapshot: EngineSnapshot;
  onExit: () => void;
  onRestart: () => void;
  onPause: () => void;
}

export default function HUD({ theme, snapshot, onExit, onRestart, onPause }: Props) {
  const overlayMessage =
    snapshot.status === "ready"
      ? theme.readyLabel
      : snapshot.status === "dying"
      ? theme.caughtLabel
      : snapshot.status === "levelclear"
      ? theme.winLabel
      : snapshot.status === "gameover"
      ? theme.gameOverLabel
      : snapshot.status === "paused"
      ? "PAUSED"
      : "";

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col font-mono text-white select-none">
      {/* top bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-3 bg-black/60 px-3 py-2 backdrop-blur-sm sm:px-6">
        <button
          onClick={onExit}
          className="rounded-md border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold tracking-wide text-white/90 hover:bg-white/20 sm:px-3 sm:text-sm"
        >
          ← Menu
        </button>
        <div className="flex items-center gap-2 text-center sm:gap-6">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-white/50 sm:text-xs">Score</div>
            <div className="text-sm font-bold sm:text-lg" style={{ color: theme.colors.hudAccent }}>
              {snapshot.score.toString().padStart(4, "0")}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-white/50 sm:text-xs">
              {theme.livesLabel}
            </div>
            <div className="text-sm font-bold sm:text-lg">{"●".repeat(Math.max(snapshot.lives, 0)) || "—"}</div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[9px] uppercase tracking-widest text-white/50 sm:text-xs">
              {theme.dotLabel[0].toUpperCase() + theme.dotLabel.slice(1)}
            </div>
            <div className="text-sm font-bold sm:text-lg">
              {snapshot.totalDots - snapshot.dotsRemaining}/{snapshot.totalDots}
            </div>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={onPause}
            className="rounded-md border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20 sm:px-3 sm:text-sm"
          >
            {snapshot.status === "paused" ? "▶" : "⏸"}
          </button>
          <button
            onClick={onRestart}
            className="rounded-md border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20 sm:px-3 sm:text-sm"
          >
            ↻
          </button>
        </div>
      </div>

      {snapshot.frightenedTimeLeft > 0 && snapshot.status === "playing" && (
        <div
          className="pointer-events-none mx-auto mt-2 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide sm:text-xs"
          style={{ background: theme.colors.frightened, color: "#fff" }}
        >
          {theme.frightenedLabel}
        </div>
      )}

      <div className="flex flex-1 items-center justify-center">
        {overlayMessage && (
          <div className="pointer-events-none rounded-xl bg-black/50 px-6 py-4 text-center backdrop-blur-sm">
            <div
              className="text-xl font-extrabold tracking-wider drop-shadow sm:text-3xl"
              style={{ color: theme.colors.hudAccent }}
            >
              {overlayMessage}
            </div>
            {snapshot.status === "gameover" && (
              <div className="mt-2 text-xs text-white/70 sm:text-sm">Final score: {snapshot.score}</div>
            )}
            {snapshot.status === "levelclear" && (
              <div className="mt-2 text-xs text-white/70 sm:text-sm">Score: {snapshot.score}</div>
            )}
            {(snapshot.status === "gameover" || snapshot.status === "levelclear") && (
              <button
                onClick={onRestart}
                className="pointer-events-auto mt-3 rounded-md border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-white/20 sm:text-sm"
              >
                Play again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
