// NURA — Dossiers 2 & 3: ingest dispatcher + tier orchestration.
//
// PRODUCTION NOTE: the docket specifies a Supabase realtime `postgres_changes`
// subscription (INSERT) on the public messages table as the ingest trigger.
// This sandbox runs a single Postgres instance without a realtime broker, so
// this module exposes the same "on new public message, run the ladder" entry
// point (`processNewChapelMessage`) that a realtime webhook/subscription
// handler would call in production — it is invoked synchronously right after
// the message insert in the Chapel API route. The tier logic itself is
// identical to what the docket specifies; only the trigger transport differs.
//
// Ingest is public-commons only. This file, and everything it calls, never
// touches a Signal/private-DM table — there isn't one in this schema.

import { appendLog } from "./nura-service";
import { runTier1 } from "./tier1";
import { runTier2 } from "./tier2";
import { runTier3 } from "./tier3";
import { applyConsequence } from "./nura-consequences";
import { recentSiteMessages } from "./nura-service";
import type { Site } from "./types";

export interface PipelineInput {
  site: Site;
  messageId: number;
  memberId: number | null;
  body: string;
  threadId: number | null;
}

export interface PipelineOutcome {
  flag: string;
  stage: string;
  action: string;
  quiet: boolean;
}

export async function processNewChapelMessage(input: PipelineInput): Promise<PipelineOutcome> {
  // TIER 1 — deterministic screen, runs on every message.
  const tier1 = await runTier1(input.site, input.body);

  if (tier1.flag === "crisis") {
    const result = await applyConsequence({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: "tier1",
      flag: "crisis",
      decidedBy: "code",
      reason: `Crisis lexicon match: ${tier1.matched.join(", ")}`,
      detail: { matched: tier1.matched },
    });
    return { flag: "crisis", stage: "tier1", action: result.wouldAction, quiet: result.quiet };
  }

  if (tier1.flag === "predation") {
    const result = await applyConsequence({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: "tier1",
      flag: "predation",
      decidedBy: "code",
      reason: `Predation pattern match: ${tier1.matched.join(", ")}`,
      detail: { matched: tier1.matched },
    });
    return { flag: "predation", stage: "tier1", action: result.wouldAction, quiet: result.quiet };
  }

  if (tier1.flag === "none") {
    if (tier1.sampledSeen) {
      await appendLog({
        site: input.site,
        messageId: input.messageId,
        memberId: input.memberId,
        stage: "tier1",
        flag: "none",
        action: "none",
        decidedBy: "code",
        reason: "Clean message (sampled).",
      });
    }
    return { flag: "none", stage: "tier1", action: "none", quiet: false };
  }

  // harm_candidate -> TIER 2
  const tier2 = await runTier2({
    site: input.site,
    authorMemberId: input.memberId,
    body: input.body,
    threadId: input.threadId,
  });

  if (tier2.resolution === "playful") {
    await appendLog({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: "tier2",
      flag: "harm_candidate",
      action: "none",
      decidedBy: "code",
      reason: tier2.reason,
      detail: { matched: tier1.matched, signals: tier2.signals },
    });
    return { flag: "harm_candidate", stage: "tier2", action: "none", quiet: false };
  }

  if (tier2.resolution === "confirmed_harm") {
    const result = await applyConsequence({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: "tier2",
      flag: "confirmed_harm",
      decidedBy: "code",
      reason: tier2.reason,
      detail: { matched: tier1.matched, signals: tier2.signals },
    });
    return { flag: "confirmed_harm", stage: "tier2", action: result.wouldAction, quiet: result.quiet };
  }

  // ambiguous -> TIER 3 (last resort, degrades safely if no model configured)
  const recent = await recentSiteMessages(input.site, 15, 8);
  const contextLines = recent
    .slice()
    .reverse()
    .map((m) => `[member ${m.memberId ?? "system"}]: ${m.body}`);

  const tier3 = await runTier3(input.site, input.body, contextLines);

  if (!tier3.class) {
    // Discarded / unavailable — fail toward not punishing, per doctrine.
    await appendLog({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: "tier3",
      flag: "harm_candidate",
      action: "none",
      decidedBy: "code",
      reason: `LLM output discarded (${tier3.discardedReason ?? "unknown"}); defaulting to no-action.`,
      detail: { matched: tier1.matched, signals: tier2.signals, raw: tier3.raw },
    });
    return { flag: "harm_candidate", stage: "tier3", action: "none", quiet: false };
  }

  const flag = tier3.class === "genuine_harm" ? "confirmed_harm" : "harm_candidate";
  const result = await applyConsequence({
    site: input.site,
    messageId: input.messageId,
    memberId: input.memberId,
    stage: "tier3",
    flag,
    llmClass: tier3.class,
    decidedBy: "llm",
    reason: `LLM classified as '${tier3.class}' (confidence ${tier3.confidence}).`,
    detail: { matched: tier1.matched, signals: tier2.signals, confidence: tier3.confidence },
  });

  return { flag, stage: "tier3", action: result.wouldAction, quiet: result.quiet };
}
