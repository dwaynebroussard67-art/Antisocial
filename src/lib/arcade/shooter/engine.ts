// PORTED, unchanged in behavior from salvage. Deterministic-when-seeded
// (rng is injectable), frame-rate independent via dt clamping — this is
// the fix for the documented backgrounded-tab tunneling bug where a huge
// dt on tab refocus could let a fast bullet skip clean through the player
// hitbox in a single frame.

export type EnemyKind = "grunt" | "shooter";
export type Bullet = { id: number; x: number; y: number; vy: number; owner: "player" | "enemy" };
export type Enemy = { id: number; x: number; y: number; vy: number; hp: number; kind: EnemyKind; lastFiredAt: number };
export type ShooterInput = { left: boolean; right: boolean; shoot: boolean };
export type ShooterState = {
  playerX: number;
  lives: number;
  invulnerableUntil: number; // measured in engine elapsedMs, not wall-clock
  bullets: Bullet[];
  enemies: Enemy[];
  score: number;
  level: number;
  elapsedMs: number;
  lastEnemySpawnAt: number;
  lastPlayerFireAt: number;
  gameOver: boolean;
};

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;
export const PLAYER_WIDTH = 36;
export const PLAYER_HEIGHT = 20;
export const PLAYER_Y = CANVAS_HEIGHT - 50;
export const ENEMY_WIDTH = 28;
export const ENEMY_HEIGHT = 20;
export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 10;

const PLAYER_SPEED = 260; // px/s
const PLAYER_BULLET_SPEED = 460; // px/s, upward
const ENEMY_BULLET_SPEED = 200; // px/s, downward
const FIRE_COOLDOWN_MS = 220;
const INVULNERABILITY_MS = 1200;
const MAX_PLAYER_BULLETS = 12; // defense-in-depth cap, independent of the cooldown
const MAX_DT_MS = 100; // clamp — the fix for the backgrounded-tab tunneling bug
const LEVEL_SCORE_STEP = 500;

function spawnIntervalMs(level: number): number {
  return Math.max(280, 1100 - (level - 1) * 90);
}
function enemySpeedForLevel(level: number): number {
  return 55 + (level - 1) * 10;
}
function enemyFireIntervalMs(level: number): number {
  return Math.max(900, 2200 - (level - 1) * 120);
}
function aabbOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

let idCounter = 0;
function nextId(): number {
  return ++idCounter;
}

export class ShooterEngine {
  state: ShooterState;
  private rng: () => number;

  // rng is injectable specifically so the verification script below can
  // force deterministic enemy spawns instead of fighting Math.random flakiness.
  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.state = {
      playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      lives: 3,
      invulnerableUntil: 0,
      bullets: [],
      enemies: [],
      score: 0,
      level: 1,
      elapsedMs: 0,
      lastEnemySpawnAt: 0,
      lastPlayerFireAt: -Infinity,
      gameOver: false,
    };
  }

  // Every life-loss path (bullet hit, body collision, enemy invasion) routes
  // through here, so the invulnerability window protects against ALL of them
  // uniformly — not just projectiles.
  private takeHit(): void {
    const s = this.state;
    if (s.elapsedMs < s.invulnerableUntil) return; // absorbed by i-frames, no-op
    s.lives -= 1;
    s.invulnerableUntil = s.elapsedMs + INVULNERABILITY_MS;
    if (s.lives <= 0) s.gameOver = true;
  }

  tick(rawDtMs: number, input: ShooterInput): void {
    const s = this.state;
    if (s.gameOver) return;
    const dtMs = Math.min(rawDtMs, MAX_DT_MS); // second clamp point, see class comment above
    const dt = dtMs / 1000;
    s.elapsedMs += dtMs;

    if (input.left) s.playerX -= PLAYER_SPEED * dt;
    if (input.right) s.playerX += PLAYER_SPEED * dt;
    s.playerX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, s.playerX));

    const playerBulletCount = s.bullets.filter((b) => b.owner === "player").length;
    if (input.shoot && s.elapsedMs - s.lastPlayerFireAt >= FIRE_COOLDOWN_MS && playerBulletCount < MAX_PLAYER_BULLETS) {
      s.bullets.push({ id: nextId(), x: s.playerX + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2, y: PLAYER_Y, vy: -PLAYER_BULLET_SPEED, owner: "player" });
      s.lastPlayerFireAt = s.elapsedMs;
    }

    for (const b of s.bullets) b.y += b.vy * dt;
    s.bullets = s.bullets.filter((b) => b.y > -BULLET_HEIGHT && b.y < CANVAS_HEIGHT + BULLET_HEIGHT);

    const survivingEnemies: Enemy[] = [];
    for (const e of s.enemies) {
      e.y += e.vy * dt;
      if (e.kind === "shooter" && s.elapsedMs - e.lastFiredAt >= enemyFireIntervalMs(s.level)) {
        s.bullets.push({ id: nextId(), x: e.x + ENEMY_WIDTH / 2 - BULLET_WIDTH / 2, y: e.y + ENEMY_HEIGHT, vy: ENEMY_BULLET_SPEED, owner: "enemy" });
        e.lastFiredAt = s.elapsedMs;
      }
      if (e.y > CANVAS_HEIGHT) {
        this.takeHit(); // unopposed invasion costs a life, same i-frame rule as everything else
        continue;
      }
      survivingEnemies.push(e);
    }
    s.enemies = survivingEnemies;

    if (s.elapsedMs - s.lastEnemySpawnAt >= spawnIntervalMs(s.level)) {
      const kind: EnemyKind = s.level >= 2 && this.rng() < 0.35 ? "shooter" : "grunt";
      s.enemies.push({
        id: nextId(),
        x: this.rng() * (CANVAS_WIDTH - ENEMY_WIDTH),
        y: -ENEMY_HEIGHT,
        vy: enemySpeedForLevel(s.level),
        hp: kind === "shooter" ? 2 : 1,
        kind,
        lastFiredAt: s.elapsedMs,
      });
      s.lastEnemySpawnAt = s.elapsedMs;
    }

    // Player bullets vs enemies. Non-piercing by design: a bullet is
    // consumed by the FIRST enemy (in array order) it overlaps this tick,
    // never damages two enemies at once even if their hitboxes overlap.
    const bulletsToRemove = new Set<number>();
    const enemiesAfterHits: Enemy[] = [];
    for (const e of s.enemies) {
      let hp = e.hp;
      for (const b of s.bullets) {
        if (b.owner !== "player" || bulletsToRemove.has(b.id)) continue;
        if (aabbOverlap(e.x, e.y, ENEMY_WIDTH, ENEMY_HEIGHT, b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT)) {
          hp -= 1;
          bulletsToRemove.add(b.id);
          if (hp <= 0) break;
        }
      }
      if (hp <= 0) s.score += (e.kind === "shooter" ? 25 : 10) * s.level;
      else enemiesAfterHits.push({ ...e, hp });
    }
    s.enemies = enemiesAfterHits;
    s.bullets = s.bullets.filter((b) => !bulletsToRemove.has(b.id));

    // Enemy bullets vs player. A bullet that touches the player is consumed
    // whether or not i-frames absorbed the damage — the incoming shot still
    // visually resolves, it just doesn't cost a life during invulnerability.
    const remainingBullets: Bullet[] = [];
    for (const b of s.bullets) {
      if (b.owner === "enemy" && aabbOverlap(s.playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT, b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT)) {
        this.takeHit();
        continue;
      }
      remainingBullets.push(b);
    }
    s.bullets = remainingBullets;

    // Enemy bodies vs player — same "consumed on contact regardless of i-frames" rule.
    const enemiesAfterBodyHits: Enemy[] = [];
    for (const e of s.enemies) {
      if (aabbOverlap(s.playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT, e.x, e.y, ENEMY_WIDTH, ENEMY_HEIGHT)) {
        this.takeHit();
        continue;
      }
      enemiesAfterBodyHits.push(e);
    }
    s.enemies = enemiesAfterBodyHits;

    s.level = 1 + Math.floor(s.score / LEVEL_SCORE_STEP);
  }
}
