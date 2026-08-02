export type Dir = "up" | "down" | "left" | "right" | "none";

export interface Vec {
  row: number;
  col: number;
}

export type GhostMode = "house" | "exiting" | "scatter" | "chase" | "frightened" | "eaten";

export interface GhostState {
  id: number;
  pos: Vec; // last integer grid cell
  prevPos: Vec; // previous grid cell (for interpolation)
  dir: Dir;
  mode: GhostMode;
  moveStart: number; // timestamp of last cell-step
  moveInterval: number; // ms per cell
  releaseAt: number; // ms timestamp (relative game clock) when it may leave the house
}

export interface PlayerState {
  pos: Vec;
  prevPos: Vec;
  dir: Dir;
  queuedDir: Dir;
  moveStart: number;
  moveInterval: number;
  mouthPhase: number;
}

export type GameStatus =
  | "ready"
  | "playing"
  | "paused"
  | "dying"
  | "levelclear"
  | "gameover";

export interface EngineSnapshot {
  status: GameStatus;
  score: number;
  lives: number;
  dotsRemaining: number;
  totalDots: number;
  frightenedTimeLeft: number;
  message: string;
}
