// NURA — config loader/writer. Everything tunable lives in `nura_config`
// (jsonb, keyed by site + key) so D can retune packs/thresholds/copy without
// a redeploy. This module just knows the default seed shape and how to read
// it back with sane fallbacks if a row is ever missing.

import { db } from "@/db";
import { nuraConfig } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type {
  ClassActionMap,
  NuraThresholds,
  ReminderCopy,
  Site,
  Tier1Packs,
} from "./types";

export const CONFIG_KEYS = {
  TIER1_PACKS: "tier1_packs",
  THRESHOLDS: "thresholds",
  CLASS_ACTION_MAP: "class_action_map",
  REMINDER_COPY: "reminder_copy",
  QUIET_MODE: "quiet_mode",
} as const;

// Conservative-at-launch defaults. D owns the actual lexicons; these are the
// tunable seed so the system is safe-by-default before real data comes in.
export const DEFAULT_TIER1_PACKS: Record<Site, Tier1Packs> = {
  antisocial: {
    crisis: [
      "kill myself",
      "want to die",
      "end it all",
      "no reason to live",
      "suicide",
      "hurting myself",
      "self harm",
      "can't go on",
    ],
    predation: [
      "our secret",
      "don't tell anyone",
      "how old are you",
      "send a pic",
      "meet me alone",
      "let's move to dm",
      "delete this after",
      "our little secret",
    ],
    harm: [
      // conservative, narrow — reciprocal-ribbing-heavy room, bias to miss
      "kill yourself",
      "worthless",
      "nobody likes you",
      "subhuman",
    ],
  },
  misfit: {
    crisis: [
      "kill myself",
      "want to die",
      "end it all",
      "no reason to live",
      "suicide",
      "hurting myself",
      "self harm",
      "can't go on",
    ],
    predation: [
      "our secret",
      "don't tell anyone",
      "how old are you",
      "send a pic",
      "meet me alone",
      "let's move to dm",
      "delete this after",
      "our little secret",
    ],
    harm: [
      "kill yourself",
      "worthless",
      "nobody likes you",
      "subhuman",
      // Misfit Ministries is sacred ground — mockery/desecration counts too.
      "fake god",
      "your god is a joke",
      "burn the bible",
      "church is a scam",
    ],
  },
};

export const DEFAULT_THRESHOLDS: Record<Site, NuraThresholds> = {
  antisocial: {
    seenSampleRate: 0.05,
    escalationWindowMinutes: 15,
    escalationRepeatCount: 3,
    ambientWindowMinutes: 30,
    ambientHateRateThreshold: 5,
    repeatOffenseForRemoveUser: 3,
    tier3ConfidenceMin: 0.6,
  },
  misfit: {
    seenSampleRate: 0.05,
    escalationWindowMinutes: 15,
    escalationRepeatCount: 2, // stricter room, escalates faster
    ambientWindowMinutes: 30,
    ambientHateRateThreshold: 3,
    repeatOffenseForRemoveUser: 2,
    tier3ConfidenceMin: 0.6,
  },
};

// Keys read by the consequence engine:
//   playful, tension, unclear            -> none
//   confirmed_harm                       -> remove_post (site-specific severity handled in code)
//   confirmed_harm_repeat                -> remove_user
//   ambient_hate                         -> nudge_public
//   severe                               -> remove_user_alert (remove_user + alert_responder)
//   crisis                               -> crisis path (handled separately, still logged here)
//   predation                            -> predation path (handled separately, still logged here)
export const DEFAULT_CLASS_ACTION_MAP: Record<Site, ClassActionMap> = {
  antisocial: {
    playful: "none",
    tension: "none",
    unclear: "none",
    confirmed_harm: "remove_post",
    confirmed_harm_repeat: "remove_user",
    ambient_hate: "nudge_public",
    severe: "remove_user",
  },
  misfit: {
    playful: "none",
    tension: "none",
    unclear: "none",
    confirmed_harm: "remove_post",
    confirmed_harm_repeat: "remove_user",
    ambient_hate: "nudge_public",
    severe: "remove_user",
  },
};

export const DEFAULT_REMINDER_COPY: Record<Site, ReminderCopy> = {
  antisocial: {
    antisocialTone:
      "Hey family — let's keep showing love in here. No names, no callouts, just a nudge. We good.",
    misfitTone: "",
  },
  misfit: {
    antisocialTone: "",
    misfitTone:
      "This is sacred ground. Speak of it, and each other, with reverence. Let's hold the room well.",
  },
};

export interface QuietMode {
  enabled: boolean;
}

export const DEFAULT_QUIET_MODE: Record<Site, QuietMode> = {
  antisocial: { enabled: true },
  misfit: { enabled: true },
};

async function readConfig<T>(site: Site, key: string, fallback: T): Promise<T> {
  const rows = await db
    .select()
    .from(nuraConfig)
    .where(and(eq(nuraConfig.site, site), eq(nuraConfig.key, key)))
    .limit(1);
  if (rows.length === 0) return fallback;
  return rows[0].value as T;
}

export async function getTier1Packs(site: Site) {
  return readConfig(site, CONFIG_KEYS.TIER1_PACKS, DEFAULT_TIER1_PACKS[site]);
}

export async function getThresholds(site: Site) {
  return readConfig(site, CONFIG_KEYS.THRESHOLDS, DEFAULT_THRESHOLDS[site]);
}

export async function getClassActionMap(site: Site) {
  return readConfig(
    site,
    CONFIG_KEYS.CLASS_ACTION_MAP,
    DEFAULT_CLASS_ACTION_MAP[site],
  );
}

export async function getReminderCopy(site: Site) {
  return readConfig(site, CONFIG_KEYS.REMINDER_COPY, DEFAULT_REMINDER_COPY[site]);
}

export async function getQuietMode(site: Site): Promise<QuietMode> {
  return readConfig(site, CONFIG_KEYS.QUIET_MODE, DEFAULT_QUIET_MODE[site]);
}

export async function setConfig(site: Site, key: string, value: unknown) {
  await db
    .insert(nuraConfig)
    .values({ site, key, value: value as object })
    .onConflictDoUpdate({
      target: [nuraConfig.site, nuraConfig.key],
      set: { value: value as object, updatedAt: new Date() },
    });
}
