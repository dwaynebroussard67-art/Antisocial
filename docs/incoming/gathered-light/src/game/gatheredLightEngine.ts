/**
 * gatheredLightEngine.ts
 *
 * Pure, framework-agnostic game logic for "The Gathered Light".
 * No React. No Supabase. No skin knowledge. Skins never touch this file.
 *
 * Concept:
 *  - Two players walk side by side along a shared path.
 *  - Each player controls only their lateral "closeness" position (y),
 *    a value from -1 (far edge) to 1 (far edge, opposite side), 0 = centered.
 *  - When players are close together, light gathers. When they drift apart,
 *    the light gently dims. There is no failure state, only softer light.
 *  - Forward progress along the path is driven by the amount of gathered
 *    light — the more light they hold together, the further they walk.
 *  - Reaching full path progress completes the session.
 */

export type PlayerId = "player1" | "player2";

export interface PlayerPosition {
  /** Lateral offset from the shared centerline, clamped to [-1, 1]. */
  y: number;
  /** Epoch ms of last update, used for staleness checks (disconnect fade). */
  updatedAt: number;
}

export type SessionStatus = "waiting" | "active" | "complete";

export interface GatheredLightState {
  status: SessionStatus;
  mode: "duo" | "solo";
  player1: PlayerPosition;
  player2: PlayerPosition;
  /** 0-100, how much light is currently held between the two players. */
  gatheredLight: number;
  /** 0-100, how far along the shared path they have walked. */
  pathProgress: number;
  /** Latest measured distance between the two players, 0-2. */
  distance: number;
  /** Whether the two players currently count as "close". */
  isClose: boolean;
  startedAt: number | null;
  completedAt: number | null;
}

export const ENGINE_CONSTANTS = {
  /** Distance at/under which players are considered "close". */
  CLOSE_THRESHOLD: 0.45,
  /** Distance beyond which the light dims fastest. */
  FAR_THRESHOLD: 1.1,
  /** Points of light gathered per second while close (duo mode). */
  GATHER_RATE: 14,
  /** Multiplier applied to gather rate while practicing solo. */
  SOLO_GATHER_MULTIPLIER: 0.55,
  /** Points of light lost per second while apart. */
  DECAY_RATE: 6,
  /** How quickly path progress advances per second at full (100) light. */
  PROGRESS_RATE: 6.5,
  /** Max lateral speed, in units/second, applied to smoothed drag input. */
  MAX_LATERAL_SPEED: 3.2,
  /** ms of inactivity before a player's ghost fades in the UI. */
  STALE_MS: 6000,
} as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createInitialState(mode: "duo" | "solo" = "duo"): GatheredLightState {
  const now = Date.now();
  return {
    status: "waiting",
    mode,
    player1: { y: 0, updatedAt: now },
    player2: { y: mode === "solo" ? 0.05 : 0, updatedAt: now },
    gatheredLight: 0,
    pathProgress: 0,
    distance: 0,
    isClose: true,
    startedAt: null,
    completedAt: null,
  };
}

/** Begin the session — call once both players are present (or solo confirmed). */
export function startSession(state: GatheredLightState): GatheredLightState {
  if (state.status !== "waiting") return state;
  return { ...state, status: "active", startedAt: Date.now() };
}

/** Move a player's lateral position by a delta (from drag/tap input), clamped. */
export function movePlayer(
  state: GatheredLightState,
  player: PlayerId,
  deltaY: number
): GatheredLightState {
  const current = state[player];
  const y = clamp(current.y + deltaY, -1, 1);
  return {
    ...state,
    [player]: { y, updatedAt: Date.now() },
  } as GatheredLightState;
}

/** Directly set a player's lateral position (used when syncing remote input). */
export function setPlayerPosition(
  state: GatheredLightState,
  player: PlayerId,
  y: number,
  updatedAt: number = Date.now()
): GatheredLightState {
  return {
    ...state,
    [player]: { y: clamp(y, -1, 1), updatedAt },
  } as GatheredLightState;
}

function measureDistance(state: GatheredLightState): number {
  return Math.abs(state.player1.y - state.player2.y);
}

/**
 * Advance the simulation by dtSeconds. Pure function: same inputs
 * always produce the same output, so it can run identically on
 * every connected client.
 */
export function tick(state: GatheredLightState, dtSeconds: number): GatheredLightState {
  if (state.status !== "active" || dtSeconds <= 0) return state;

  const distance = measureDistance(state);
  const isClose = distance <= ENGINE_CONSTANTS.CLOSE_THRESHOLD;

  const gatherRate =
    ENGINE_CONSTANTS.GATHER_RATE *
    (state.mode === "solo" ? ENGINE_CONSTANTS.SOLO_GATHER_MULTIPLIER : 1);

  // Smooth falloff: fully far = full decay, in-between eases.
  const farRatio = clamp(
    (distance - ENGINE_CONSTANTS.CLOSE_THRESHOLD) /
      (ENGINE_CONSTANTS.FAR_THRESHOLD - ENGINE_CONSTANTS.CLOSE_THRESHOLD),
    0,
    1
  );

  let gatheredLight = state.gatheredLight;
  if (isClose) {
    gatheredLight = clamp(gatheredLight + gatherRate * dtSeconds, 0, 100);
  } else {
    gatheredLight = clamp(
      gatheredLight - ENGINE_CONSTANTS.DECAY_RATE * farRatio * dtSeconds,
      0,
      100
    );
  }

  const pathProgress = clamp(
    state.pathProgress + (gatheredLight / 100) * ENGINE_CONSTANTS.PROGRESS_RATE * dtSeconds,
    0,
    100
  );

  const complete = pathProgress >= 100;

  return {
    ...state,
    distance,
    isClose,
    gatheredLight,
    pathProgress,
    status: complete ? "complete" : state.status,
    completedAt: complete ? state.completedAt ?? Date.now() : state.completedAt,
  };
}

/** True if a player's last update is old enough to be considered idle/gone. */
export function isPlayerStale(player: PlayerPosition, now: number = Date.now()): boolean {
  return now - player.updatedAt > ENGINE_CONSTANTS.STALE_MS;
}

/** Convenience: reconcile local predicted state with an authoritative snapshot. */
export function reconcile(
  local: GatheredLightState,
  authoritative: Partial<GatheredLightState>
): GatheredLightState {
  return { ...local, ...authoritative };
}

/** Simple simulated "ghost" partner for solo practice mode. */
export function stepGhost(
  state: GatheredLightState,
  dtSeconds: number,
  t: number
): GatheredLightState {
  if (state.mode !== "solo") return state;
  // Gentle wandering sine wave so the light responds, but practice is easier.
  const wander = Math.sin(t / 1800) * 0.35 + Math.sin(t / 520) * 0.08;
  const targetY = clamp(state.player1.y * 0.4 + wander, -1, 1);
  const y = state.player2.y + clamp(targetY - state.player2.y, -1, 1) * Math.min(1, dtSeconds * 1.2);
  return setPlayerPosition(state, "player2", y, Date.now());
}
