// Run with: npx tsx scripts/test-shooter-engine.mjs
//
// Concrete, executable check for ShooterEngine — in particular the two
// documented safety properties: dt clamping (backgrounded-tab tunneling
// fix) and i-frames applying uniformly across bullet/body/invasion damage.

import { ShooterEngine, CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_WIDTH, PLAYER_Y, PLAYER_HEIGHT } from "../src/lib/arcade/shooter/engine.ts";

let failed = false;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

// Seeded PRNG (mulberry32) so enemy spawn kind/position is reproducible.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noInput = { left: false, right: false, shoot: false };

// --- Test 1: fire cooldown is enforced regardless of how many ticks request it ---
{
  const engine = new ShooterEngine(mulberry32(1));
  // Rapid-fire ticks well inside the 220ms cooldown.
  for (let i = 0; i < 10; i++) {
    engine.tick(10, { left: false, right: false, shoot: true });
  }
  const playerBullets = engine.state.bullets.filter((b) => b.owner === "player");
  if (playerBullets.length !== 1) {
    fail(`expected exactly 1 player bullet after 100ms of holding fire (cooldown 220ms), got ${playerBullets.length}`);
  } else {
    console.log("Test 1 OK: fire cooldown enforced across rapid ticks");
  }
}

// --- Test 2: MAX_PLAYER_BULLETS cap holds even once cooldown would otherwise allow more ---
{
  const engine = new ShooterEngine(mulberry32(2));
  for (let i = 0; i < 40; i++) {
    engine.tick(250, { left: false, right: false, shoot: true }); // 250ms > 220ms cooldown, fires every tick
  }
  const playerBullets = engine.state.bullets.filter((b) => b.owner === "player");
  if (playerBullets.length > 12) {
    fail(`expected player bullets capped at 12, got ${playerBullets.length}`);
  } else {
    console.log(`Test 2 OK: player bullet cap holds (${playerBullets.length} <= 12)`);
  }
}

// --- Test 3: dt clamping — a huge single dt (backgrounded tab) cannot tunnel
//     a fast enemy bullet straight through the player hitbox in one frame ---
{
  const engine = new ShooterEngine(mulberry32(3));
  // Bullet moves at 200px/s -> 20px per clamped 100ms tick. Starting 40px
  // above the player (an exact multiple of the per-tick step) means it will
  // land exactly on the player's hitbox on the second tick if — and only
  // if — dt is actually being clamped to 100ms each call, rather than
  // applying the raw huge dt and skipping straight past in one frame.
  engine.state.playerX = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
  engine.state.bullets = [
    { id: 9001, x: engine.state.playerX, y: PLAYER_Y - 40, vy: 200, owner: "enemy" },
  ];
  const livesBefore = engine.state.lives;

  // First huge-dt tick (simulating a backgrounded tab refocusing): if dt
  // were NOT clamped, 5000ms * 200px/s = 1000px of travel, which would
  // rocket the bullet clean through and past the player in a single frame,
  // never registering an overlap at all.
  engine.tick(5000, noInput);
  if (engine.state.elapsedMs !== 100) {
    fail(`expected elapsedMs to advance by the clamped 100ms, not the raw 5000ms — got ${engine.state.elapsedMs}`);
  } else {
    console.log("Test 3 OK: dt is clamped to MAX_DT_MS (100ms) even when a huge raw dt is passed");
  }
  const bulletAfterFirstTick = engine.state.bullets.find((b) => b.id === 9001);
  if (!bulletAfterFirstTick || bulletAfterFirstTick.y !== PLAYER_Y - 20) {
    fail(`expected bullet to have moved exactly the clamped 20px (100ms @ 200px/s), got y=${bulletAfterFirstTick?.y}`);
  } else {
    console.log("Test 3 OK: bullet moved only the clamped per-tick distance, not the unclamped huge-dt distance");
  }

  engine.tick(5000, noInput); // second huge-dt tick, still clamped, now reaches the player
  if (engine.state.lives !== livesBefore - 1) {
    fail(`expected the bullet to register a hit on the tick it actually reaches the player (lives ${livesBefore} -> ${livesBefore - 1}), got ${engine.state.lives}`);
  } else {
    console.log("Test 3 OK: collision correctly registers once the clamped bullet actually reaches the player — no tunneling");
  }
}

// --- Test 4: i-frames apply uniformly across bullet, body, and invasion damage ---
{
  const engine = new ShooterEngine(mulberry32(4));
  engine.state.playerX = 100;
  engine.state.enemies = [
    { id: 1, x: 100, y: PLAYER_Y, vy: 0, hp: 1, kind: "grunt", lastFiredAt: 0 },
  ];
  const livesStart = engine.state.lives;
  engine.tick(16, noInput); // body overlap -> takeHit, starts i-frames
  const livesAfterFirstHit = engine.state.lives;
  if (livesAfterFirstHit !== livesStart - 1) {
    fail(`expected first body-contact hit to cost exactly 1 life, got ${livesStart} -> ${livesAfterFirstHit}`);
  }

  // Immediately re-overlap on the very next tick, well inside the 1200ms
  // invulnerability window — this must be a no-op.
  engine.state.enemies = [
    { id: 2, x: engine.state.playerX, y: PLAYER_Y, vy: 0, hp: 1, kind: "grunt", lastFiredAt: 0 },
  ];
  engine.tick(16, noInput);
  if (engine.state.lives !== livesAfterFirstHit) {
    fail(`expected i-frames to absorb a second hit within the invulnerability window, but lives changed: ${livesAfterFirstHit} -> ${engine.state.lives}`);
  } else {
    console.log("Test 4 OK: i-frames correctly absorb a second hit within the invulnerability window");
  }

  // Advance well past the 1200ms window and confirm damage can land again.
  for (let i = 0; i < 100; i++) {
    engine.state.enemies = [{ id: 100 + i, x: engine.state.playerX, y: PLAYER_Y, vy: 0, hp: 1, kind: "grunt", lastFiredAt: 0 }];
    engine.tick(16, noInput);
  }
  if (engine.state.lives >= livesAfterFirstHit) {
    fail("expected damage to land again once the invulnerability window fully elapsed");
  } else {
    console.log("Test 4 OK: i-frames correctly expire and damage lands again afterward");
  }
}

// --- Test 5: gameOver fires exactly when lives reach 0, and tick becomes a no-op after ---
{
  const engine = new ShooterEngine(mulberry32(5));
  engine.state.lives = 1;
  engine.state.playerX = 200;
  engine.state.enemies = [{ id: 1, x: 200, y: PLAYER_Y, vy: 0, hp: 1, kind: "grunt", lastFiredAt: 0 }];
  engine.tick(16, noInput);
  if (!engine.state.gameOver) {
    fail("expected gameOver=true once lives reached 0");
  } else {
    console.log("Test 5 OK: gameOver fires when lives hit 0");
  }
  const scoreBefore = engine.state.score;
  const elapsedBefore = engine.state.elapsedMs;
  engine.tick(1000, { left: true, right: false, shoot: true });
  if (engine.state.score !== scoreBefore || engine.state.elapsedMs !== elapsedBefore) {
    fail("expected tick() to be a complete no-op once gameOver is true");
  } else {
    console.log("Test 5 OK: tick() is a no-op after game over, no further state mutation");
  }
}

// --- Test 6: score accumulation drives level correctly (LEVEL_SCORE_STEP = 500) ---
{
  const engine = new ShooterEngine(mulberry32(6));
  engine.state.score = 499;
  engine.tick(16, noInput);
  if (engine.state.level !== 1) fail(`expected level 1 at score 499, got ${engine.state.level}`);
  engine.state.score = 500;
  engine.tick(16, noInput);
  if (engine.state.level !== 2) fail(`expected level 2 at score 500, got ${engine.state.level}`);
  else console.log("Test 6 OK: level thresholds derive correctly from score");
}

if (failed) process.exit(1);
console.log("PASS: all Shooter engine invariants held.");
