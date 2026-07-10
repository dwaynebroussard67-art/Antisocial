import { BaseStats, StatusEffect, baseDerivedStats, withStatusModifiers } from "./stats";

// PORTED, unchanged in behavior from salvage. This is the fourth "risky
// engine" in this build alongside War, Mystery, and Shooter — a
// verification script (npx tsx scripts/test-rpg-combat-engine.mjs, salvage
// reference only, not yet re-created in this project) uses a seeded
// mulberry32 PRNG so combat results are reproducible.

export type PlayerCombatState = {
  currentHp: number;
  maxHp: number;
  currentMp: number;
  maxMp: number;
  stats: BaseStats;
  statuses: StatusEffect[];
  defending: boolean;
};

export type EnemyCombatState = {
  instanceId: number;
  templateKey: string;
  name: string;
  currentHp: number;
  maxHp: number;
  stats: BaseStats;
  statuses: StatusEffect[];
  abilityKeys: string[];
  xpReward: number;
  goldReward: number;
  unfleeable: boolean;
};

export type CombatLogEntry = { actor: string; text: string };

export type CombatSessionState = {
  player: PlayerCombatState;
  enemies: EnemyCombatState[];
  log: CombatLogEntry[];
  round: number;
  status: "active" | "victory" | "defeat" | "fled";
};

export type AbilityDef = {
  key: string;
  name: string;
  mpCost: number;
  targetType: "enemy" | "self" | "all_enemies";
  effectType: "physical_damage" | "magic_damage" | "heal" | "status";
  powerMultiplier: number;
  statusEffect: { kind: StatusEffect["kind"]; duration: number; magnitude: number } | null;
};

export type PlayerAction =
  | { type: "basic_attack"; targetInstanceId: number }
  | { type: "ability"; abilityKey: string; targetInstanceId?: number }
  | { type: "defend" }
  | { type: "use_item"; healAmount: number }
  | { type: "flee" };

function rollDamage(
  atk: ReturnType<typeof baseDerivedStats>,
  def: ReturnType<typeof baseDerivedStats>,
  rng: () => number,
  powerMultiplier: number,
  school: "physical" | "magic"
): { damage: number; dodged: boolean; crit: boolean } {
  if (rng() < def.dodgeChance) return { damage: 0, dodged: true, crit: false };
  const isCrit = rng() < atk.critChance;
  const variance = 0.9 + rng() * 0.2;
  const rawAtk = school === "physical" ? atk.physicalAttack : atk.magicAttack;
  const rawDef = school === "physical" ? def.physicalDefense : def.magicDefense;
  const base = Math.max(1, rawAtk - rawDef);
  return { damage: Math.round(base * variance * powerMultiplier * (isCrit ? 1.5 : 1)), dodged: false, crit: isCrit };
}

function applyDamage(
  target: PlayerCombatState | EnemyCombatState,
  result: ReturnType<typeof rollDamage>,
  log: CombatLogEntry[],
  actor: string,
  name: string
) {
  if (result.dodged) {
    log.push({ actor, text: `${name} dodges the attack!` });
    return;
  }
  let dmg = result.damage;
  if ("defending" in target && target.defending) dmg = Math.round(dmg * 0.5);
  target.currentHp = Math.max(0, target.currentHp - dmg);
  log.push({ actor, text: `${name} takes ${dmg} damage${result.crit ? " (critical hit!)" : ""}.` });
}

function sortBySpeed(entries: { key: string; speed: number }[], rng: () => number) {
  return entries
    .map((e) => ({ e, jitter: rng() }))
    .sort((a, b) => b.e.speed - a.e.speed || b.jitter - a.jitter)
    .map((x) => x.e);
}

function removeDead(enemies: EnemyCombatState[], log: CombatLogEntry[]): { alive: EnemyCombatState[]; deadKeys: string[] } {
  const alive: EnemyCombatState[] = [];
  const deadKeys: string[] = [];
  for (const e of enemies) {
    if (e.currentHp <= 0) {
      log.push({ actor: "system", text: `${e.name} is defeated.` });
      deadKeys.push(e.templateKey);
    } else alive.push(e);
  }
  return { alive, deadKeys };
}

function tickStatuses(entity: PlayerCombatState | EnemyCombatState, log: CombatLogEntry[], label: string) {
  const remaining: StatusEffect[] = [];
  for (const s of entity.statuses) {
    if (s.kind === "poison") {
      entity.currentHp = Math.max(0, entity.currentHp - s.magnitude);
      log.push({ actor: "system", text: `${label} takes ${s.magnitude} poison damage.` });
    }
    if (s.kind === "regen") {
      entity.currentHp = Math.min(entity.maxHp, entity.currentHp + s.magnitude);
      log.push({ actor: "system", text: `${label} regenerates ${s.magnitude} HP.` });
    }
    const left = s.remainingTurns - 1;
    if (left > 0) remaining.push({ ...s, remainingTurns: left });
    else log.push({ actor: "system", text: `${label}'s ${s.kind.replace("_", " ")} wears off.` });
  }
  entity.statuses = remaining;
}

function resolvePlayerAction(
  player: PlayerCombatState,
  enemies: EnemyCombatState[],
  action: PlayerAction,
  abilities: Record<string, AbilityDef>,
  rng: () => number,
  log: CombatLogEntry[]
) {
  player.defending = false;
  if (action.type === "defend") {
    player.defending = true;
    log.push({ actor: "player", text: "You brace for the enemy's attack." });
    return;
  }
  if (action.type === "use_item") {
    player.currentHp = Math.min(player.maxHp, player.currentHp + action.healAmount);
    log.push({ actor: "player", text: `You use an item and recover ${action.healAmount} HP.` });
    return;
  }
  if (action.type === "basic_attack") {
    const target = enemies.find((e) => e.instanceId === action.targetInstanceId && e.currentHp > 0);
    if (!target) {
      log.push({ actor: "system", text: "Invalid target." });
      return;
    }
    const atk = withStatusModifiers(baseDerivedStats(player.stats), player.statuses);
    const def = withStatusModifiers(baseDerivedStats(target.stats), target.statuses);
    applyDamage(target, rollDamage(atk, def, rng, 1, "physical"), log, "player", target.name);
    return;
  }

  const ability = abilities[action.type === "ability" ? action.abilityKey : ""];
  if (action.type !== "ability" || !ability) {
    log.push({ actor: "system", text: "Unknown ability." });
    return;
  }
  if (player.currentMp < ability.mpCost) {
    log.push({ actor: "system", text: "Not enough MP." });
    return;
  }
  player.currentMp -= ability.mpCost;

  const targets: (PlayerCombatState | EnemyCombatState)[] =
    ability.targetType === "all_enemies"
      ? enemies.filter((e) => e.currentHp > 0)
      : ability.targetType === "self"
        ? [player]
        : enemies.filter((e) => e.instanceId === action.targetInstanceId && e.currentHp > 0);

  if (targets.length === 0) {
    log.push({ actor: "system", text: "Invalid target." });
    return;
  }

  for (const target of targets) {
    const isPlayer = target === player;
    const name = isPlayer ? "You" : (target as EnemyCombatState).name;
    if (ability.effectType === "physical_damage" || ability.effectType === "magic_damage") {
      const atk = withStatusModifiers(baseDerivedStats(player.stats), player.statuses);
      const def = withStatusModifiers(baseDerivedStats(target.stats), target.statuses);
      const result = rollDamage(atk, def, rng, ability.powerMultiplier, ability.effectType === "physical_damage" ? "physical" : "magic");
      applyDamage(target, result, log, "player", name);
      if (ability.statusEffect && result.damage > 0) target.statuses.push({ ...ability.statusEffect, remainingTurns: ability.statusEffect.duration });
    } else if (ability.effectType === "heal") {
      const healAmt = Math.round(ability.powerMultiplier * baseDerivedStats(player.stats).magicAttack);
      target.currentHp = Math.min(target.maxHp, target.currentHp + healAmt);
      log.push({ actor: "player", text: `${isPlayer ? "You heal" : name + " is healed"} for ${healAmt} HP.` });
    } else if (ability.effectType === "status" && ability.statusEffect) {
      target.statuses.push({ ...ability.statusEffect, remainingTurns: ability.statusEffect.duration });
      log.push({ actor: "player", text: `${isPlayer ? "You are" : name + " is"} afflicted with ${ability.statusEffect.kind}.` });
    }
  }
  log.push({ actor: "player", text: `You cast ${ability.name}.` });
}

function resolveEnemyAction(
  enemy: EnemyCombatState,
  player: PlayerCombatState,
  abilities: Record<string, AbilityDef>,
  rng: () => number,
  log: CombatLogEntry[]
) {
  const known = enemy.abilityKeys.map((k) => abilities[k]).filter((a): a is AbilityDef => !!a);
  const healAbility = known.find((a) => a.effectType === "heal");
  const hpRatio = enemy.currentHp / enemy.maxHp;

  // Deliberately simple, stated AI: heal if low, otherwise a coin-flip chance
  // to use a damage ability, otherwise a basic attack. "Deep" in this build
  // refers to the stat/ability/status system, not enemy decision-making.
  let chosen: AbilityDef | null = null;
  if (healAbility && hpRatio < 0.3) chosen = healAbility;
  else {
    const damageAbilities = known.filter((a) => a.effectType !== "heal");
    if (damageAbilities.length > 0 && rng() < 0.5) chosen = damageAbilities[Math.floor(rng() * damageAbilities.length)];
  }

  if (chosen?.effectType === "heal") {
    const healAmt = Math.round(chosen.powerMultiplier * baseDerivedStats(enemy.stats).magicAttack);
    enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + healAmt);
    log.push({ actor: enemy.name, text: `${enemy.name} heals for ${healAmt} HP.` });
    return;
  }

  const ability = chosen;
  const atk = withStatusModifiers(baseDerivedStats(enemy.stats), enemy.statuses);
  const def = withStatusModifiers(baseDerivedStats(player.stats), player.statuses);
  const result = rollDamage(atk, def, rng, ability?.powerMultiplier ?? 1, ability?.effectType === "magic_damage" ? "magic" : "physical");
  applyDamage(player, result, log, enemy.name, "You");
  if (ability?.statusEffect && result.damage > 0) player.statuses.push({ ...ability.statusEffect, remainingTurns: ability.statusEffect.duration });
  log.push({ actor: enemy.name, text: ability ? `${enemy.name} uses ${ability.name}.` : `${enemy.name} attacks.` });
}

export function advanceRound(
  state: CombatSessionState,
  playerAction: PlayerAction,
  abilities: Record<string, AbilityDef>,
  rng: () => number = Math.random
): { state: CombatSessionState; deadEnemyTemplateKeys: string[] } {
  if (state.status !== "active") return { state, deadEnemyTemplateKeys: [] };

  const player: PlayerCombatState = { ...state.player, statuses: [...state.player.statuses] };
  let enemies: EnemyCombatState[] = state.enemies.map((e) => ({ ...e, statuses: [...e.statuses] }));
  const log: CombatLogEntry[] = [];
  const allDeadKeys: string[] = [];

  if (playerAction.type === "flee") {
    if (enemies.some((e) => e.unfleeable)) {
      log.push({ actor: "system", text: "You can't flee from this fight." });
      return { state: { ...state, log: [...state.log, ...log] }, deadEnemyTemplateKeys: [] };
    }
    log.push({ actor: "player", text: "You flee from the battle." });
    return { state: { ...state, player, enemies, log: [...state.log, ...log], status: "fled" }, deadEnemyTemplateKeys: [] };
  }

  const order = sortBySpeed(
    [
      { key: "player", speed: withStatusModifiers(baseDerivedStats(player.stats), player.statuses).speed },
      ...enemies.map((e) => ({ key: String(e.instanceId), speed: withStatusModifiers(baseDerivedStats(e.stats), e.statuses).speed })),
    ],
    rng
  );

  for (const turn of order) {
    if (player.currentHp <= 0 || enemies.length === 0) break;
    if (turn.key === "player") {
      if (player.statuses.some((s) => s.kind === "stun")) {
        log.push({ actor: "player", text: "You are stunned and cannot act." });
        continue;
      }
      resolvePlayerAction(player, enemies, playerAction, abilities, rng, log);
      const { alive, deadKeys } = removeDead(enemies, log);
      enemies = alive;
      allDeadKeys.push(...deadKeys);
    } else {
      const enemy = enemies.find((e) => String(e.instanceId) === turn.key);
      if (!enemy || enemy.currentHp <= 0) continue;
      if (enemy.statuses.some((s) => s.kind === "stun")) {
        log.push({ actor: enemy.name, text: `${enemy.name} is stunned and cannot act.` });
        continue;
      }
      resolveEnemyAction(enemy, player, abilities, rng, log);
    }
  }

  let status: CombatSessionState["status"] = "active";
  if (player.currentHp <= 0) status = "defeat";
  else if (enemies.length === 0) status = "victory";

  if (status === "active") {
    tickStatuses(player, log, "You");
    for (const e of enemies) tickStatuses(e, log, e.name);
    if (player.currentHp <= 0) status = "defeat"; // poison can finish the player off during the end-of-round tick
  }

  return {
    state: { player, enemies, log: [...state.log, ...log], round: state.round + 1, status },
    deadEnemyTemplateKeys: allDeadKeys,
  };
}
