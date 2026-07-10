// PORTED, unchanged in behavior from salvage.

export type BaseStats = { str: number; dex: number; int: number; vit: number; wis: number; level: number };

// The core formula set. Every number here is a real, stated design choice —
// not tuned against playtesting data that doesn't exist yet, but internally
// consistent and hand-verifiable (see the verification script, still owed).
export function baseDerivedStats(s: BaseStats) {
  return {
    maxHp: 20 + s.vit * 8 + s.level * 5,
    maxMp: 10 + s.int * 4 + s.wis * 2 + s.level * 2,
    physicalAttack: s.str * 2 + s.level,
    physicalDefense: Math.round(s.vit * 1.5 + s.level * 0.5),
    magicAttack: s.int * 2 + s.level,
    magicDefense: Math.round(s.wis * 1.5 + s.level * 0.5),
    speed: s.dex * 1.5,
    critChance: Math.min(0.35, 0.05 + s.dex * 0.01),
    dodgeChance: Math.min(0.25, s.dex * 0.008),
  };
}

export type EffectiveStats = ReturnType<typeof baseDerivedStats>;
export type StatusKind = "poison" | "stun" | "buff_atk" | "debuff_def" | "regen";
export type StatusEffect = { kind: StatusKind; remainingTurns: number; magnitude: number };

// Uniform application point for every buff/debuff, regardless of whether it
// originated from a player ability or an enemy ability — one code path
// means player-cast and enemy-cast status effects can never silently diverge.
export function withStatusModifiers(base: EffectiveStats, statuses: StatusEffect[]): EffectiveStats {
  let { physicalAttack, physicalDefense, magicAttack, magicDefense } = base;
  for (const s of statuses) {
    if (s.kind === "buff_atk") {
      physicalAttack += s.magnitude;
      magicAttack += s.magnitude;
    }
    if (s.kind === "debuff_def") {
      physicalDefense = Math.max(0, physicalDefense - s.magnitude);
      magicDefense = Math.max(0, magicDefense - s.magnitude);
    }
  }
  return { ...base, physicalAttack, physicalDefense, magicAttack, magicDefense };
}

export function xpToNextLevel(level: number): number {
  return level * 100;
}
