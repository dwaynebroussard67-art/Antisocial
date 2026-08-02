// NURA — Tier 1: deterministic screen. Runs on every message. Cheap, code
// only, no LLM. Crisis and predation flags here skip straight to escalation
// (Dossier 4); harm_candidate goes on to Tier 2 (context resolver).

import { getThresholds, getTier1Packs } from "./config";
import type { Flag, Site } from "./types";

export interface Tier1Result {
  flag: Flag;
  matched: string[];
  sampledSeen: boolean;
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function findMatches(haystack: string, patterns: string[]): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    if (!p) continue;
    if (haystack.includes(p.toLowerCase())) hits.push(p);
  }
  return hits;
}

/**
 * Runs the deterministic screen. Order matters: crisis and predation are
 * checked first and win outright (per doctrine, they bypass context entirely
 * — speed and certainty over nuance). Harm pack is intentionally the
 * narrowest / most conservative pack at launch.
 */
export async function runTier1(site: Site, body: string): Promise<Tier1Result> {
  const [packs, thresholds] = await Promise.all([getTier1Packs(site), getThresholds(site)]);
  const text = normalize(body);

  const crisisHits = findMatches(text, packs.crisis);
  if (crisisHits.length > 0) {
    return { flag: "crisis", matched: crisisHits, sampledSeen: false };
  }

  const predationHits = findMatches(text, packs.predation);
  if (predationHits.length > 0) {
    return { flag: "predation", matched: predationHits, sampledSeen: false };
  }

  const harmHits = findMatches(text, packs.harm);
  if (harmHits.length > 0) {
    return { flag: "harm_candidate", matched: harmHits, sampledSeen: false };
  }

  // Clean message. Only sample a fraction into the log so it stays readable.
  const sampled = Math.random() < thresholds.seenSampleRate;
  return { flag: "none", matched: [], sampledSeen: sampled };
}
