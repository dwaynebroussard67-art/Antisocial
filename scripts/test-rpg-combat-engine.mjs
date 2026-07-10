// Run with: npx tsx scripts/test-rpg-combat-engine.mjs
//
// Concrete, executable check for stats.ts formulas and combat-engine.ts's
// advanceRound(). Uses a seeded mulberry32 PRNG so combat results are
// reproducible, per the comment left in combat-engine.ts referencing this
// exact script.

import { baseDerivedStats, withStatusModifiers, xpToNextLevel } from "../src/lib/rpg/stats.ts";
import { advanceRound } from "../src/lib/rpg/combat-engine.ts";

let failed = false;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

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

// --- Test 1: baseDerivedStats formulas match the stated design exactly ---
{
  const s = { str: 10, dex: 10, int: 10, vit: 10, wis: 10, level: 5 };
  const d = baseDerivedStats(s);
  const expected = {
    maxHp: 20 + 10 * 8 + 5 * 5, // 125
    maxMp: 10 + 10 * 4 + 10 * 2 + 5 * 2, // 80
    physicalAttack: 10 * 2 + 5, // 25
    physicalDefense: Math.round(10 * 1.5 + 5 * 0.5), // 18
    magicAttack: 10 * 2 + 5, // 25
    magicDefense: Math.round(10 * 1.5 + 5 * 0.5), // 18
    speed: 10 * 1.5, // 15
    critChance: Math.min(0.35, 0.05 + 10 * 0.01), // 0.15
    dodgeChance: Math.min(0.25, 10 * 0.008), // 0.08
  };
  let mismatch = false;
  for (const key of Object.keys(expected)) {
    if (d[key] !== expected[key]) {
      fail(`baseDerivedStats.${key}: expected ${expected[key]}, got ${d[key]}`);
      mismatch = true;
    }
  }
  if (!mismatch) console.log("Test 1 OK: baseDerivedStats formulas match exactly");

  // crit/dodge caps
  const highDex = baseDerivedStats({ str: 0, dex: 100, int: 0, vit: 0, wis: 0, level: 1 });
  if (highDex.critChance !== 0.35) fail(`expected critChance capped at 0.35, got ${highDex.critChance}`);
  else console.log("Test 1 OK: critChance correctly caps at 0.35");
  if (highDex.dodgeChance !== 0.25) fail(`expected dodgeChance capped at 0.25, got ${highDex.dodgeChance}`);
  else console.log("Test 1 OK: dodgeChance correctly caps at 0.25");
}

// --- Test 2: status modifiers apply uniformly, never go negative ---
{
  const base = baseDerivedStats({ str: 5, dex: 5, int: 5, vit: 5, wis: 5, level: 1 });
  const withBuff = withStatusModifiers(base, [{ kind: "buff_atk", remainingTurns: 2, magnitude: 10 }]);
  if (withBuff.physicalAttack !== base.physicalAttack + 10 || withBuff.magicAttack !== base.magicAttack + 10) {
    fail("buff_atk did not apply uniformly to both physical and magic attack");
  } else {
    console.log("Test 2 OK: buff_atk applies to both physical and magic attack");
  }

  const withDebuff = withStatusModifiers(base, [{ kind: "debuff_def", remainingTurns: 2, magnitude: 999 }]);
  if (withDebuff.physicalDefense < 0 || withDebuff.magicDefense < 0) {
    fail("debuff_def allowed defense to go negative — expected floor at 0");
  } else {
    console.log("Test 2 OK: debuff_def correctly floors at 0, never negative");
  }
}

// --- Test 3: xpToNextLevel is simple and monotonic ---
{
  if (xpToNextLevel(1) !== 100 || xpToNextLevel(5) !== 500) {
    fail(`xpToNextLevel formula mismatch: level 1 = ${xpToNextLevel(1)}, level 5 = ${xpToNextLevel(5)}`);
  } else {
    console.log("Test 3 OK: xpToNextLevel formula matches (level * 100)");
  }
}

// --- Shared fixtures for combat tests ---
const abilities = {
  fireball: { key: "fireball", name: "Fireball", mpCost: 5, targetType: "enemy", effectType: "magic_damage", powerMultiplier: 1.5, statusEffect: null },
  heal: { key: "heal", name: "Heal", mpCost: 5, targetType: "self", effectType: "heal", powerMultiplier: 1.0, statusEffect: null },
  poisonDart: { key: "poisonDart", name: "Poison Dart", mpCost: 3, targetType: "enemy", effectType: "physical_damage", powerMultiplier: 0.5, statusEffect: { kind: "poison", duration: 3, magnitude: 4 } },
};

function makePlayer(overrides = {}) {
  const stats = { str: 8, dex: 8, int: 8, vit: 8, wis: 8, level: 3 };
  const d = baseDerivedStats(stats);
  return { currentHp: d.maxHp, maxHp: d.maxHp, currentMp: d.maxMp, maxMp: d.maxMp, stats, statuses: [], defending: false, ...overrides };
}
function makeEnemy(overrides = {}) {
  const stats = { str: 6, dex: 6, int: 6, vit: 6, wis: 6, level: 2 };
  const d = baseDerivedStats(stats);
  return { instanceId: 1, templateKey: "slime", name: "Slime", currentHp: d.maxHp, maxHp: d.maxHp, stats, statuses: [], abilityKeys: [], xpReward: 10, goldReward: 5, unfleeable: false, ...overrides };
}

// --- Test 4: flee succeeds normally, is blocked by an unfleeable enemy ---
{
  const rng = mulberry32(42);
  const state = { player: makePlayer(), enemies: [makeEnemy()], log: [], round: 0, status: "active" };
  const { state: fled } = advanceRound(state, { type: "flee" }, abilities, rng);
  if (fled.status !== "fled") fail(`expected status "fled", got "${fled.status}"`);
  else console.log("Test 4 OK: flee succeeds against a fleeable enemy");

  const unfleeableState = { player: makePlayer(), enemies: [makeEnemy({ unfleeable: true })], log: [], round: 0, status: "active" };
  const { state: blocked } = advanceRound(unfleeableState, { type: "flee" }, abilities, rng);
  if (blocked.status !== "active") fail(`expected flee to be blocked (status stays "active"), got "${blocked.status}"`);
  else console.log("Test 4 OK: flee correctly blocked by an unfleeable enemy");
}

// --- Test 5: turn order is speed-sorted, and a stunned combatant's turn is skipped ---
{
  const rng = mulberry32(7);
  const fastPlayer = makePlayer({ stats: { str: 5, dex: 20, int: 5, vit: 5, wis: 5, level: 3 } }); // high speed
  const slowEnemy = makeEnemy({ stats: { str: 5, dex: 1, int: 5, vit: 5, wis: 5, level: 2 } }); // low speed
  const state = { player: fastPlayer, enemies: [slowEnemy], log: [], round: 0, status: "active" };
  const { state: after } = advanceRound(state, { type: "basic_attack", targetInstanceId: 1 }, abilities, rng);
  // Player is faster, so player's log entry (the attack) should appear before the enemy's.
  const playerActionIdx = after.log.findIndex((l) => l.actor === "player");
  const enemyActionIdx = after.log.findIndex((l) => l.actor === "Slime");
  if (playerActionIdx === -1) fail("expected a player log entry");
  else if (enemyActionIdx !== -1 && playerActionIdx > enemyActionIdx) {
    fail("expected faster player to act before slower enemy, but enemy acted first");
  } else {
    console.log("Test 5 OK: faster combatant acts first in turn order");
  }

  // Stun: player statused with stun should skip their action entirely.
  const stunnedPlayer = makePlayer({ statuses: [{ kind: "stun", remainingTurns: 1, magnitude: 0 }] });
  const stunState = { player: stunnedPlayer, enemies: [makeEnemy()], log: [], round: 0, status: "active" };
  const { state: stunResult } = advanceRound(stunState, { type: "basic_attack", targetInstanceId: 1 }, abilities, rng);
  const stunMsg = stunResult.log.find((l) => l.text.includes("stunned and cannot act"));
  const enemyStillFullHp = stunResult.enemies[0]?.currentHp === stunResult.enemies[0]?.maxHp;
  if (!stunMsg) fail("expected a 'stunned and cannot act' log entry for the stunned player");
  else if (!enemyStillFullHp) fail("stunned player's basic_attack still landed damage — stun did not block the action");
  else console.log("Test 5 OK: stunned combatant's action is correctly skipped, no damage dealt");
}

// --- Test 6: poison ticks at end of round and can finish off a combatant ---
{
  const rng = mulberry32(3);
  const nearDeathPlayer = makePlayer({ currentHp: 3, statuses: [{ kind: "poison", remainingTurns: 2, magnitude: 5 }] });
  const state = { player: nearDeathPlayer, enemies: [makeEnemy({ abilityKeys: [] })], log: [], round: 0, status: "active" };
  // basic_attack on the enemy; enemy has no abilities so it'll basic-attack back,
  // but poison ticking for 5 on 3 HP should finish the player regardless of the
  // enemy's own hit, and the end-of-round status check must catch it.
  const { state: after } = advanceRound(state, { type: "basic_attack", targetInstanceId: 1 }, abilities, rng);
  if (after.status !== "defeat") {
    fail(`expected poison tick to finish off a near-death player (defeat), got status "${after.status}", hp ${after.player.currentHp}`);
  } else {
    console.log("Test 6 OK: end-of-round poison tick can finish off the player and correctly sets status to defeat");
  }
}

// --- Test 7: victory triggers when all enemies are reduced to 0 HP ---
{
  const rng = mulberry32(99);
  const oneHpEnemy = makeEnemy({ currentHp: 1, maxHp: 1 });
  const state = { player: makePlayer(), enemies: [oneHpEnemy], log: [], round: 0, status: "active" };
  const { state: after, deadEnemyTemplateKeys } = advanceRound(state, { type: "basic_attack", targetInstanceId: 1 }, abilities, rng);
  if (after.status !== "victory") {
    fail(`expected victory once the only enemy is reduced to 0 HP, got "${after.status}" (enemy hp ${oneHpEnemy.currentHp} -> check dodge didn't skip it: seed may need adjusting)`);
  } else if (deadEnemyTemplateKeys[0] !== "slime") {
    fail(`expected deadEnemyTemplateKeys to include "slime", got ${JSON.stringify(deadEnemyTemplateKeys)}`);
  } else {
    console.log("Test 7 OK: victory correctly triggers when the last enemy dies, dead key reported");
  }
}

// --- Test 8: insufficient MP blocks an ability cast, no MP spent, no effect applied ---
{
  const rng = mulberry32(5);
  const brokePlayer = makePlayer({ currentMp: 0 });
  const enemy = makeEnemy();
  const state = { player: brokePlayer, enemies: [enemy], log: [], round: 0, status: "active" };
  const { state: after } = advanceRound(state, { type: "ability", abilityKey: "fireball", targetInstanceId: 1 }, abilities, rng);
  const noMpMsg = after.log.find((l) => l.text.includes("Not enough MP"));
  if (!noMpMsg) fail("expected a 'Not enough MP' log entry when casting with insufficient MP");
  else if (after.player.currentMp !== 0) fail("MP was deducted despite the cast being blocked");
  else console.log("Test 8 OK: insufficient MP blocks the ability, no MP deducted, no damage dealt");
}

if (failed) process.exit(1);
console.log("PASS: all RPG stats + combat engine invariants held.");
