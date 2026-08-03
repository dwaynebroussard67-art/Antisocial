import {
  buildGrid,
  CellType,
  COLS,
  countPellets,
  GHOST_EXIT,
  GHOST_HOUSE_CENTER,
  GHOST_STARTS,
  isWalkable,
  PLAYER_START,
  ROWS,
  SCATTER_CORNERS,
} from "./maze";
import type { Dir, GhostState, PlayerState, Vec, GameStatus } from "./types";

const DIR_VECT: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
  none: { dr: 0, dc: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
  none: "none",
};

export interface EngineOptions {
  baseSpeed?: number;
  ghostSpeed?: number;
  lives?: number;
  onEvent?: (name: string) => void;
}

export interface EngineSnapshot {
  status: GameStatus;
  score: number;
  lives: number;
  dotsRemaining: number;
  totalDots: number;
  frightenedTimeLeft: number;
  message: string;
}

function wrapCol(c: number): number {
  return ((c % COLS) + COLS) % COLS;
}

export class GameEngine {
  grid: CellType[][];
  totalDots: number;
  dotsRemaining: number;
  player!: PlayerState;
  ghosts!: GhostState[];
  score = 0;
  lives: number;
  status: GameStatus = "ready";
  message = "READY!";
  frightenedUntil = 0;
  ghostEatChain = 0;
  modeSchedule: { mode: "scatter" | "chase"; duration: number }[];
  modeIndex = 0;
  modeTimer = 0;
  clock = 0;
  readyTimer = 1600;
  dyingTimer = 0;
  playerSpeed: number;
  ghostSpeedBase: number;
  opts: EngineOptions;

  constructor(opts: EngineOptions = {}) {
    this.opts = opts;
    this.playerSpeed = opts.baseSpeed ?? 165;
    this.ghostSpeedBase = opts.ghostSpeed ?? 195;
    this.lives = opts.lives ?? 3;
    this.grid = buildGrid();
    this.totalDots = countPellets(this.grid);
    this.dotsRemaining = this.totalDots;
    this.modeSchedule = [
      { mode: "scatter", duration: 7000 },
      { mode: "chase", duration: 20000 },
      { mode: "scatter", duration: 7000 },
      { mode: "chase", duration: 20000 },
      { mode: "scatter", duration: 5000 },
      { mode: "chase", duration: 999999999 },
    ];
    this.resetEntities();
  }

  private emit(name: string) {
    this.opts.onEvent?.(name);
  }

  private freshPlayer(): PlayerState {
    return {
      pos: { ...PLAYER_START },
      prevPos: { ...PLAYER_START },
      dir: "none",
      queuedDir: "none",
      moveStart: 0,
      moveInterval: this.playerSpeed,
      mouthPhase: 0,
    };
  }

  private freshGhost(id: number): GhostState {
    const start = GHOST_STARTS[id];
    const releaseSchedule = [0, 3000, 7000, 11000];
    return {
      id,
      pos: { ...start },
      prevPos: { ...start },
      dir: "none",
      mode: id === 0 ? "exiting" : "house",
      moveStart: 0,
      moveInterval: this.ghostSpeedBase,
      releaseAt: releaseSchedule[id] ?? 12000,
    };
  }

  private resetEntities() {
    this.player = this.freshPlayer();
    this.ghosts = GHOST_STARTS.map((_, i) => this.freshGhost(i));
    this.clock = 0;
    this.modeIndex = 0;
    this.modeTimer = 0;
    this.frightenedUntil = 0;
    this.ghostEatChain = 0;
  }

  reset() {
    this.grid = buildGrid();
    this.totalDots = countPellets(this.grid);
    this.dotsRemaining = this.totalDots;
    this.score = 0;
    this.lives = this.opts.lives ?? 3;
    this.resetEntities();
    this.status = "ready";
    this.message = "READY!";
    this.readyTimer = 1600;
  }

  togglePause() {
    if (this.status === "playing") this.status = "paused";
    else if (this.status === "paused") this.status = "playing";
  }

  setDirection(dir: Dir) {
    this.player.queuedDir = dir;
  }

  private currentGlobalMode(): "scatter" | "chase" {
    return this.modeSchedule[this.modeIndex].mode;
  }

  tick(dtMsRaw: number) {
    const dtMs = Math.min(dtMsRaw, 48);
    if (this.status === "ready") {
      this.readyTimer -= dtMs;
      if (this.readyTimer <= 0) {
        this.status = "playing";
        this.message = "";
      }
      return;
    }
    if (this.status === "dying") {
      this.dyingTimer -= dtMs;
      if (this.dyingTimer <= 0) this.finishDeath();
      return;
    }
    if (this.status !== "playing") return;

    this.clock += dtMs;
    this.updateModeSchedule(dtMs);
    this.updateFrightened();
    this.stepPlayer(this.clock);
    for (const g of this.ghosts) this.stepGhost(g, this.clock);
    this.checkCollisions();
  }

  private updateModeSchedule(dt: number) {
    if (this.frightenedUntil > 0) return; // pause schedule while frightened
    this.modeTimer += dt;
    const current = this.modeSchedule[this.modeIndex];
    if (this.modeTimer >= current.duration && this.modeIndex < this.modeSchedule.length - 1) {
      this.modeTimer = 0;
      this.modeIndex++;
      const newMode = this.currentGlobalMode();
      for (const g of this.ghosts) {
        if (g.mode === "scatter" || g.mode === "chase") {
          g.mode = newMode;
          g.dir = OPPOSITE[g.dir];
        }
      }
    }
  }

  private activateFrightened() {
    this.frightenedUntil = this.clock + 8000;
    this.ghostEatChain = 0;
    for (const g of this.ghosts) {
      if (g.mode === "scatter" || g.mode === "chase") {
        g.mode = "frightened";
        g.dir = OPPOSITE[g.dir];
      }
    }
    this.emit("power");
  }

  private updateFrightened() {
    if (this.frightenedUntil > 0 && this.clock >= this.frightenedUntil) {
      this.frightenedUntil = 0;
      const cur = this.currentGlobalMode();
      for (const g of this.ghosts) {
        if (g.mode === "frightened") g.mode = cur;
      }
    }
  }

  private stepPlayer(now: number) {
    const p = this.player;
    if (now - p.moveStart < p.moveInterval) return;
    const from = p.pos;
    const candidates: Dir[] = [];
    if (p.queuedDir !== "none") candidates.push(p.queuedDir);
    if (p.dir !== "none") candidates.push(p.dir);
    let moved = false;
    for (const d of candidates) {
      const v = DIR_VECT[d];
      const nr = from.row + v.dr;
      const nc = wrapCol(from.col + v.dc);
      if (isWalkable(this.grid, nr, nc)) {
        p.prevPos = { ...from };
        p.pos = { row: nr, col: nc };
        p.dir = d;
        p.moveStart = now;
        moved = true;
        break;
      }
    }
    if (!moved) {
      p.prevPos = { ...p.pos };
      p.moveStart = now;
    } else {
      this.onPlayerEnter(p.pos);
    }
  }

  private onPlayerEnter(pos: Vec) {
    const cell = this.grid[pos.row][pos.col];
    if (cell === "dot") {
      this.grid[pos.row][pos.col] = "empty";
      this.dotsRemaining--;
      this.score += 10;
      this.emit("dot");
    } else if (cell === "pellet") {
      this.grid[pos.row][pos.col] = "empty";
      this.dotsRemaining--;
      this.score += 50;
      this.activateFrightened();
    }
    if (this.dotsRemaining <= 0) {
      this.status = "levelclear";
      this.message = "LEVEL CLEAR!";
    }
  }

  private availableDirs(from: Vec, currentDir: Dir): Dir[] {
    const order: Dir[] = ["up", "left", "down", "right"];
    const opposite = OPPOSITE[currentDir];
    const options = order.filter((d) => {
      const v = DIR_VECT[d];
      const nr = from.row + v.dr;
      const nc = wrapCol(from.col + v.dc);
      return isWalkable(this.grid, nr, nc);
    });
    const nonReverse = options.filter((d) => d !== opposite);
    return nonReverse.length > 0 ? nonReverse : options;
  }

  private pickBestDir(from: Vec, options: Dir[], target: Vec): Dir {
    let best: Dir = options[0];
    let bestDist = Infinity;
    for (const d of options) {
      const v = DIR_VECT[d];
      const nr = from.row + v.dr;
      const nc = from.col + v.dc;
      const dist = (nr - target.row) ** 2 + (nc - target.col) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }

  private getChaseTarget(g: GhostState): Vec {
    const p = this.player.pos;
    const dir = this.player.dir === "none" ? "right" : this.player.dir;
    const pv = DIR_VECT[dir];
    switch (g.id % 4) {
      case 0:
        return { row: p.row, col: p.col };
      case 1:
        return { row: p.row + pv.dr * 4, col: p.col + pv.dc * 4 };
      case 2: {
        const blinky = this.ghosts[0]?.pos ?? p;
        const ahead = { row: p.row + pv.dr * 2, col: p.col + pv.dc * 2 };
        return {
          row: ahead.row + (ahead.row - blinky.row),
          col: ahead.col + (ahead.col - blinky.col),
        };
      }
      default: {
        const dist = (g.pos.row - p.row) ** 2 + (g.pos.col - p.col) ** 2;
        return dist > 64 ? p : SCATTER_CORNERS[3];
      }
    }
  }

  private ghostInterval(g: GhostState): number {
    if (g.mode === "frightened") return this.ghostSpeedBase * 1.6;
    if (g.mode === "eaten") return this.ghostSpeedBase * 0.45;
    if (g.mode === "exiting") return this.ghostSpeedBase * 0.9;
    return this.ghostSpeedBase;
  }

  private stepGhost(g: GhostState, now: number) {
    if (g.mode === "house") {
      if (this.clock >= g.releaseAt) g.mode = "exiting";
      return;
    }
    if (now - g.moveStart < g.moveInterval) return;
    const from = g.pos;

    let target: Vec;
    if (g.mode === "exiting") target = GHOST_EXIT;
    else if (g.mode === "eaten") target = GHOST_HOUSE_CENTER;
    else if (g.mode === "scatter") target = SCATTER_CORNERS[g.id % 4];
    else if (g.mode === "frightened") target = this.player.pos;
    else target = this.getChaseTarget(g);

    const options = this.availableDirs(from, g.dir);
    let nextDir: Dir;
    if (g.mode === "frightened") {
      nextDir = options[Math.floor(Math.random() * options.length)];
    } else {
      nextDir = this.pickBestDir(from, options, target);
    }

    const v = DIR_VECT[nextDir];
    const nr = from.row + v.dr;
    const nc = wrapCol(from.col + v.dc);
    g.prevPos = { ...from };
    g.pos = { row: nr, col: nc };
    g.dir = nextDir;
    g.moveStart = now;
    g.moveInterval = this.ghostInterval(g);

    if (g.mode === "exiting" && g.pos.row === GHOST_EXIT.row && g.pos.col === GHOST_EXIT.col) {
      g.mode = this.frightenedUntil > 0 ? "frightened" : this.currentGlobalMode();
    }
    if (g.mode === "eaten" && g.pos.row === GHOST_HOUSE_CENTER.row && g.pos.col === GHOST_HOUSE_CENTER.col) {
      g.mode = "exiting";
    }
  }

  private loseLife() {
    this.lives--;
    this.status = "dying";
    this.dyingTimer = 1300;
    this.message = this.lives > 0 ? "GOT CAUGHT!" : "GAME OVER";
    this.emit("death");
  }

  private finishDeath() {
    if (this.lives <= 0) {
      this.status = "gameover";
      this.message = "GAME OVER";
      return;
    }
    this.resetEntities();
    this.status = "ready";
    this.message = "READY!";
    this.readyTimer = 1600;
  }

  private checkCollisions() {
    for (const g of this.ghosts) {
      if (g.pos.row === this.player.pos.row && g.pos.col === this.player.pos.col) {
        if (g.mode === "frightened") {
          g.mode = "eaten";
          this.ghostEatChain++;
          this.score += 200 * Math.pow(2, Math.min(this.ghostEatChain - 1, 3));
          this.emit("eatGhost");
        } else if (g.mode === "chase" || g.mode === "scatter" || g.mode === "exiting") {
          this.loseLife();
          return;
        }
      }
    }
  }

  getSnapshot(): EngineSnapshot {
    return {
      status: this.status,
      score: this.score,
      lives: this.lives,
      dotsRemaining: this.dotsRemaining,
      totalDots: this.totalDots,
      frightenedTimeLeft: Math.max(0, this.frightenedUntil - this.clock),
      message: this.message,
    };
  }
}

export function lerpPos(prev: Vec, cur: Vec, t: number): { row: number; col: number } {
  const dc = cur.col - prev.col;
  if (Math.abs(dc) > COLS / 2) {
    return { row: cur.row, col: cur.col };
  }
  const dr = cur.row - prev.row;
  return { row: prev.row + dr * t, col: prev.col + dc * t };
}

export function entityRenderPos(
  e: { pos: Vec; prevPos: Vec; moveStart: number; moveInterval: number },
  now: number
): { row: number; col: number } {
  const t = Math.max(0, Math.min(1, (now - e.moveStart) / e.moveInterval));
  return lerpPos(e.prevPos, e.pos, t);
}

export { ROWS, COLS };
