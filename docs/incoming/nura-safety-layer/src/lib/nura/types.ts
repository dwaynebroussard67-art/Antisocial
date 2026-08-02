// NURA — shared types. One brain, two postures (Antisocial / Misfit Ministries).

export type Site = "antisocial" | "misfit";

export type Stage = "tier1" | "tier2" | "tier3";

export type Flag =
  | "none"
  | "harm_candidate"
  | "confirmed_harm"
  | "crisis"
  | "predation";

export type LlmClass =
  | "playful"
  | "tension"
  | "genuine_harm"
  | "crisis"
  | "unclear";

export type Action =
  | "none"
  | "pastoral_reply"
  | "nudge_public"
  | "remove_post"
  | "remove_user"
  | "alert_responder";

export type DecidedBy = "code" | "llm" | "human";

export interface Tier1Packs {
  crisis: string[];
  predation: string[];
  harm: string[];
}

export interface ClassActionMap {
  // keys are Flag or LlmClass values collapsed into one lookup the
  // consequence engine reads; see nura-consequences.ts for exact keys used.
  [key: string]: Action;
}

export interface NuraThresholds {
  seenSampleRate: number; // 0..1 chance a clean message gets a 'seen' log row
  escalationWindowMinutes: number; // recent-message window for Tier 2
  escalationRepeatCount: number; // flags within window => treat as escalating
  ambientWindowMinutes: number; // window for ambient hate-rate nudge
  ambientHateRateThreshold: number; // count of confirmed_harm in window => nudge_public
  repeatOffenseForRemoveUser: number; // confirmed_harm remove_post count => remove_user
  tier3ConfidenceMin: number; // minimum confidence to trust an LLM class
}

export interface ReminderCopy {
  antisocialTone: string;
  misfitTone: string;
}
