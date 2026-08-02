// NURA — Dossier 4: the consequence engine + crisis/predation rescue net.
// Code decides, always. This is the only module that turns a flag/class +
// context + site into an actual action. LLM output never reaches here as
// anything but a label.

import {
  appendLog,
  appendReminder,
  countRemovePostActionsForUser,
  dispatchAlert,
  postPastoralReply,
  recentConfirmedHarmCountSitewide,
  recordAction,
} from "./nura-service";
import { getClassActionMap, getQuietMode, getReminderCopy, getThresholds } from "./config";
import type { DecidedBy, Flag, LlmClass, Site, Stage } from "./types";

export interface ConsequenceInput {
  site: Site;
  messageId: number | null;
  memberId: number | null;
  stage: Stage;
  flag: Flag;
  llmClass?: LlmClass | null;
  decidedBy: DecidedBy;
  reason: string;
  detail?: Record<string, unknown>;
}

export interface ConsequenceResult {
  wouldAction: string;
  applied: boolean; // false when quiet mode holds it back
  quiet: boolean;
}

const CRISIS_PASTORAL_COPY =
  "I see you. You're not alone, and this matters. Someone's here — hang tight with me for a second.";

/**
 * Crisis path — always escalates, never context-resolved away, never
 * softened by site. Nura raises the flag and holds the space; she never
 * counsels alone. A responder answering is the verified crisis call.
 */
async function handleCrisis(input: ConsequenceInput): Promise<ConsequenceResult> {
  const quiet = (await getQuietMode(input.site)).enabled;

  if (quiet) {
    await appendLog({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: input.stage,
      flag: "crisis",
      llmClass: input.llmClass ?? null,
      action: "none",
      decidedBy: input.decidedBy,
      reason: `[QUIET MODE] Would alert_responder + pastoral_reply. ${input.reason}`,
      detail: input.detail ?? null,
    });
    return { wouldAction: "alert_responder+pastoral_reply", applied: false, quiet: true };
  }

  await dispatchAlert({
    site: input.site,
    memberId: input.memberId,
    messageId: input.messageId,
    reason: `CRISIS: ${input.reason}`,
    logInput: {
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: input.stage,
      flag: "crisis",
      llmClass: input.llmClass ?? null,
      action: "alert_responder",
      decidedBy: input.decidedBy,
      reason: input.reason,
      detail: input.detail ?? null,
    },
  });

  await postPastoralReply(input.site, input.messageId, CRISIS_PASTORAL_COPY, {
    site: input.site,
    messageId: input.messageId,
    memberId: input.memberId,
    stage: input.stage,
    flag: "crisis",
    llmClass: input.llmClass ?? null,
    action: "pastoral_reply",
    decidedBy: input.decidedBy,
    reason: "Crisis holding message posted alongside responder dispatch.",
    detail: input.detail ?? null,
  });

  return { wouldAction: "alert_responder+pastoral_reply", applied: true, quiet: false };
}

/**
 * Predation path — always escalates, hard, immediately. Never softened.
 * Removes the user's access outright and alerts responders/admins. No
 * warning, no "they were probably kidding."
 */
async function handlePredation(input: ConsequenceInput): Promise<ConsequenceResult> {
  const quiet = (await getQuietMode(input.site)).enabled;

  if (quiet) {
    await appendLog({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: input.stage,
      flag: "predation",
      llmClass: input.llmClass ?? null,
      action: "none",
      decidedBy: input.decidedBy,
      reason: `[QUIET MODE] Would remove_user + alert_responder immediately. ${input.reason}`,
      detail: input.detail ?? null,
    });
    return { wouldAction: "remove_user+alert_responder", applied: false, quiet: true };
  }

  if (input.memberId) {
    await recordAction({
      site: input.site,
      targetType: "user",
      targetId: input.memberId,
      action: "remove_user",
      reason: `PREDATION: ${input.reason}`,
      logInput: {
        site: input.site,
        messageId: input.messageId,
        memberId: input.memberId,
        stage: input.stage,
        flag: "predation",
        llmClass: input.llmClass ?? null,
        action: "remove_user",
        decidedBy: input.decidedBy,
        reason: input.reason,
        detail: input.detail ?? null,
      },
    });
  }

  await dispatchAlert({
    site: input.site,
    memberId: input.memberId,
    messageId: input.messageId,
    reason: `PREDATION: ${input.reason}`,
    logInput: {
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: input.stage,
      flag: "predation",
      llmClass: input.llmClass ?? null,
      action: "alert_responder",
      decidedBy: input.decidedBy,
      reason: input.reason,
      detail: input.detail ?? null,
    },
  });

  return { wouldAction: "remove_user+alert_responder", applied: true, quiet: false };
}

/** Ambient hate-rate nudge — never aimed, room-wide, no names. */
async function maybeAmbientNudge(site: Site) {
  const thresholds = await getThresholds(site);
  const quiet = (await getQuietMode(site)).enabled;
  const count = await recentConfirmedHarmCountSitewide(site, thresholds.ambientWindowMinutes);
  if (count < thresholds.ambientHateRateThreshold) return;

  const copy = await getReminderCopy(site);
  const body = site === "antisocial" ? copy.antisocialTone : copy.misfitTone;
  if (!body) return;

  if (quiet) {
    await appendLog({
      site,
      stage: "tier2",
      flag: "confirmed_harm",
      action: "none",
      decidedBy: "code",
      reason: `[QUIET MODE] Would nudge_public — ambient confirmed_harm count ${count} >= ${thresholds.ambientHateRateThreshold} in ${thresholds.ambientWindowMinutes}m`,
      detail: { count },
    });
    return;
  }

  await appendReminder(site, body, `ambient_hate_rate:${count}_in_${thresholds.ambientWindowMinutes}m`);
}

/** Confirmed-harm / genuine-harm path — remove_post, escalating to remove_user on repeat. */
async function handleConfirmedHarm(input: ConsequenceInput): Promise<ConsequenceResult> {
  const quiet = (await getQuietMode(input.site)).enabled;
  const thresholds = await getThresholds(input.site);
  const map = await getClassActionMap(input.site);

  const priorRemovals = input.memberId
    ? await countRemovePostActionsForUser(input.site, input.memberId)
    : 0;
  const isRepeat = priorRemovals + 1 >= thresholds.repeatOffenseForRemoveUser;
  const action = isRepeat ? map.confirmed_harm_repeat ?? "remove_user" : map.confirmed_harm ?? "remove_post";

  if (quiet) {
    await appendLog({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: input.stage,
      flag: "confirmed_harm",
      llmClass: input.llmClass ?? null,
      action: "none",
      decidedBy: input.decidedBy,
      reason: `[QUIET MODE] Would ${action}. ${input.reason}`,
      detail: { ...input.detail, priorRemovals, isRepeat },
    });
    await maybeAmbientNudge(input.site);
    return { wouldAction: action, applied: false, quiet: true };
  }

  if (action === "remove_user" && input.memberId) {
    await recordAction({
      site: input.site,
      targetType: "user",
      targetId: input.memberId,
      action: "remove_user",
      reason: `Repeat confirmed harm (${priorRemovals + 1} incidents): ${input.reason}`,
      logInput: {
        site: input.site,
        messageId: input.messageId,
        memberId: input.memberId,
        stage: input.stage,
        flag: "confirmed_harm",
        llmClass: input.llmClass ?? null,
        action: "remove_user",
        decidedBy: input.decidedBy,
        reason: input.reason,
        detail: { ...input.detail, priorRemovals, isRepeat },
      },
    });
  } else if (input.messageId) {
    await recordAction({
      site: input.site,
      targetType: "post",
      targetId: input.messageId,
      action: "remove_post",
      reason: input.reason,
      logInput: {
        site: input.site,
        messageId: input.messageId,
        memberId: input.memberId,
        stage: input.stage,
        flag: "confirmed_harm",
        llmClass: input.llmClass ?? null,
        action: "remove_post",
        decidedBy: input.decidedBy,
        reason: input.reason,
        detail: { ...input.detail, priorRemovals, isRepeat },
      },
    });
  } else {
    await appendLog({
      site: input.site,
      messageId: input.messageId,
      memberId: input.memberId,
      stage: input.stage,
      flag: "confirmed_harm",
      llmClass: input.llmClass ?? null,
      action: "none",
      decidedBy: input.decidedBy,
      reason: `Confirmed harm but no target to act on: ${input.reason}`,
      detail: input.detail ?? null,
    });
  }

  await maybeAmbientNudge(input.site);
  return { wouldAction: action, applied: true, quiet: false };
}

async function handleNoAction(input: ConsequenceInput): Promise<ConsequenceResult> {
  await appendLog({
    site: input.site,
    messageId: input.messageId,
    memberId: input.memberId,
    stage: input.stage,
    flag: input.flag,
    llmClass: input.llmClass ?? null,
    action: "none",
    decidedBy: input.decidedBy,
    reason: input.reason,
    detail: input.detail ?? null,
  });
  return { wouldAction: "none", applied: true, quiet: false };
}

/**
 * The single entry point the pipeline calls once a tier has settled a flag.
 * Reads the active site's config, applies doctrine (#5 asymmetry), and never
 * lets the LLM pick anything beyond the `llmClass` label already computed.
 */
export async function applyConsequence(input: ConsequenceInput): Promise<ConsequenceResult> {
  if (input.flag === "crisis" || input.llmClass === "crisis") {
    return handleCrisis(input);
  }
  if (input.flag === "predation") {
    return handlePredation(input);
  }
  if (input.flag === "confirmed_harm" || input.llmClass === "genuine_harm") {
    return handleConfirmedHarm({ ...input, flag: "confirmed_harm" });
  }
  return handleNoAction(input);
}
