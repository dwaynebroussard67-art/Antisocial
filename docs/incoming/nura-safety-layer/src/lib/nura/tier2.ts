// NURA — Tier 2: context resolver. Only runs on harm_candidate. Deterministic
// heuristics over the flagged message + recent thread window. Must be able to
// settle the common cases without ever calling the LLM (cost + latency + the
// doctrine's bias toward restraint). Resolves to 'playful' | 'confirmed_harm'
// | 'ambiguous' (ambiguous goes on to Tier 3).

import { chapelMessages, members } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { getThresholds } from "./config";
import { recentFlagsForMember, recentSiteMessages } from "./nura-service";
import type { Site } from "./types";

export type Tier2Resolution = "playful" | "confirmed_harm" | "ambiguous";

export interface Tier2Result {
  resolution: Tier2Resolution;
  signals: {
    reciprocity: boolean;
    friendlyRelationship: boolean;
    targetPresent: boolean;
    targetHandle: string | null;
    escalating: boolean;
  };
  reason: string;
}

const PLAYFUL_MARKERS = ["lol", "lmao", "haha", "jk", "😂", "🤣", "just kidding", "love you"];

function extractMention(body: string): string | null {
  const match = body.match(/@([a-zA-Z0-9_]+)/);
  return match ? match[1].toLowerCase() : null;
}

export async function runTier2(input: {
  site: Site;
  authorMemberId: number | null;
  body: string;
  threadId: number | null;
}): Promise<Tier2Result> {
  const thresholds = await getThresholds(input.site);
  const targetHandle = extractMention(input.body);

  const recent = await recentSiteMessages(input.site, thresholds.escalationWindowMinutes, 100);

  // target present: mentioned handle belongs to someone who has actually
  // posted recently (i.e. is "in the room"), vs an absent third party.
  let targetPresent = false;
  let targetMemberId: number | null = null;
  if (targetHandle) {
    const [targetMember] = await db
      .select()
      .from(members)
      .where(eq(members.handle, targetHandle))
      .limit(1);
    if (targetMember) {
      targetMemberId = targetMember.id;
      targetPresent = recent.some((m) => m.memberId === targetMember.id);
    }
  }

  // reciprocity: within the recent window, did the target also address the
  // author with the same register (mutual ribbing), or are there playful
  // markers surrounding the exchange?
  let reciprocity = false;
  if (input.authorMemberId) {
    const [author] = await db
      .select()
      .from(members)
      .where(eq(members.id, input.authorMemberId))
      .limit(1);
    if (author) {
      const authorHandleMention = `@${author.handle.toLowerCase()}`;
      reciprocity = recent.some(
        (m) =>
          m.memberId === targetMemberId &&
          m.body.toLowerCase().includes(authorHandleMention),
      );
    }
  }
  const lowerBody = input.body.toLowerCase();
  const hasPlayfulMarker = PLAYFUL_MARKERS.some((p) => lowerBody.includes(p));
  const surroundingPlayful = recent
    .slice(0, 6)
    .some((m) => PLAYFUL_MARKERS.some((p) => m.body.toLowerCase().includes(p)));
  reciprocity = reciprocity || hasPlayfulMarker || surroundingPlayful;

  // relationship: same tier => treat as friendly-history baseline.
  let friendlyRelationship = false;
  if (input.authorMemberId && targetMemberId) {
    const [author] = await db.select().from(members).where(eq(members.id, input.authorMemberId)).limit(1);
    const [target] = await db.select().from(members).where(eq(members.id, targetMemberId)).limit(1);
    if (author && target && author.tier === target.tier) friendlyRelationship = true;
  }

  // escalation: repeat harm_candidate / confirmed_harm flags for this author
  // within the window => a rising pattern, not a one-off.
  let escalating = false;
  if (input.authorMemberId) {
    const flags = await recentFlagsForMember(
      input.site,
      input.authorMemberId,
      thresholds.escalationWindowMinutes,
      ["harm_candidate", "confirmed_harm"],
    );
    escalating = flags.length >= thresholds.escalationRepeatCount;
  }

  const signals = { reciprocity, friendlyRelationship, targetPresent, targetHandle, escalating };

  // A rising pattern aimed at a present target overrides playful signals —
  // repeat targeted behavior is not "just clowning" anymore.
  if (escalating && targetPresent) {
    return {
      resolution: "confirmed_harm",
      signals,
      reason: "Repeat harm-candidate pattern aimed at a present target within the escalation window.",
    };
  }

  // No target in the room (venting about an absent third party, or
  // in-group/reclaimed usage) resolves clearly playful/non-actionable.
  if (!targetPresent) {
    return {
      resolution: "playful",
      signals,
      reason: "No present target — likely venting, in-group, or reclaimed usage.",
    };
  }

  // Target present, but clear mutual/friendly banter and not escalating.
  if (targetPresent && (reciprocity || friendlyRelationship) && !escalating) {
    return {
      resolution: "playful",
      signals,
      reason: "Target present but signals indicate reciprocal/friendly banter, not escalating.",
    };
  }

  // Target present, no reciprocity, no friendly-history signal — genuinely
  // looks targeted, but we're not certain enough to skip judgment.
  if (targetPresent && !reciprocity && !friendlyRelationship) {
    return {
      resolution: "ambiguous",
      signals,
      reason: "Target present with no reciprocity/relationship signal — needs Tier 3 judgment.",
    };
  }

  return { resolution: "ambiguous", signals, reason: "No heuristic confidently resolved this case." };
}
