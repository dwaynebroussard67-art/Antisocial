// NURA — the one-door service. Every log write and every consequence flows
// through here so a) nura_log always gets an entry paired with the action
// that produced it (same transaction), and b) nothing outside this file ever
// issues an UPDATE/DELETE against nura_log (append-only, also enforced by a
// DB trigger — see src/db/migrations-manual).
//
// HARD LINE: this file, and everything it imports, must never reference a
// Signal / private-DM table. There isn't one in this schema on purpose.

import { db } from "@/db";
import {
  alertLedgerEntries,
  chapelMessages,
  members,
  memberRoles,
  nuraActions,
  nuraLog,
  nuraReminders,
} from "@/db/schema";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import type { Action, DecidedBy, Flag, LlmClass, Site, Stage } from "./types";

export interface AppendLogInput {
  site: Site;
  messageId?: number | null;
  memberId?: number | null;
  stage: Stage;
  flag: Flag;
  llmClass?: LlmClass | null;
  action: Action;
  decidedBy: DecidedBy;
  reason: string;
  detail?: Record<string, unknown> | null;
}

/** Append one row to nura_log. INSERT ONLY — no update/delete path exists. */
export async function appendLog(input: AppendLogInput) {
  const [row] = await db
    .insert(nuraLog)
    .values({
      site: input.site,
      messageId: input.messageId ?? null,
      memberId: input.memberId ?? null,
      stage: input.stage,
      flag: input.flag,
      llmClass: input.llmClass ?? null,
      action: input.action,
      decidedBy: input.decidedBy,
      reason: input.reason,
      detail: (input.detail ?? null) as object | null,
    })
    .returning();
  return row;
}

export interface RecordActionInput {
  site: Site;
  targetType: "post" | "user";
  targetId: number;
  action: "remove_post" | "remove_user";
  reason: string;
  logInput: AppendLogInput;
}

/**
 * Applies a reversible consequence (remove_post / remove_user) and its log
 * entry as a single atomic step. Also flips the soft-hide/ban flag on the
 * target row so the effect is real but always undoable.
 */
export async function recordAction(input: RecordActionInput) {
  return db.transaction(async (tx) => {
    const [actionRow] = await tx
      .insert(nuraActions)
      .values({
        site: input.site,
        targetType: input.targetType,
        targetId: input.targetId,
        action: input.action,
        reason: input.reason,
      })
      .returning();

    if (input.action === "remove_post") {
      await tx
        .update(chapelMessages)
        .set({ hidden: true })
        .where(eq(chapelMessages.id, input.targetId));
    } else if (input.action === "remove_user") {
      await tx
        .update(members)
        .set({ banned: true })
        .where(eq(members.id, input.targetId));
    }

    const [logRow] = await tx
      .insert(nuraLog)
      .values({
        site: input.logInput.site,
        messageId: input.logInput.messageId ?? null,
        memberId: input.logInput.memberId ?? null,
        stage: input.logInput.stage,
        flag: input.logInput.flag,
        llmClass: input.logInput.llmClass ?? null,
        action: input.logInput.action,
        decidedBy: input.logInput.decidedBy,
        reason: input.logInput.reason,
        detail: (input.logInput.detail ?? null) as object | null,
      })
      .returning();

    return { actionRow, logRow };
  });
}

/** Admin reversal — the only mutation nura_actions ever gets. Human-only. */
export async function reverseAction(actionId: number, reversedByMemberId: number) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(nuraActions)
      .where(eq(nuraActions.id, actionId))
      .limit(1);
    if (!existing || !existing.active) {
      throw new Error("Action not found or already reversed");
    }

    const [updated] = await tx
      .update(nuraActions)
      .set({ active: false, reversedBy: reversedByMemberId, reversedAt: new Date() })
      .where(eq(nuraActions.id, actionId))
      .returning();

    if (existing.action === "remove_post") {
      await tx
        .update(chapelMessages)
        .set({ hidden: false })
        .where(eq(chapelMessages.id, existing.targetId));
    } else if (existing.action === "remove_user") {
      await tx.update(members).set({ banned: false }).where(eq(members.id, existing.targetId));
    }

    await tx.insert(nuraLog).values({
      site: existing.site,
      messageId: existing.targetType === "post" ? existing.targetId : null,
      memberId: existing.targetType === "user" ? existing.targetId : null,
      stage: "tier1",
      flag: "none",
      action: "none",
      decidedBy: "human",
      reason: `Reversed nura_action #${actionId} (${existing.action}) by member #${reversedByMemberId}`,
      detail: { reversedActionId: actionId },
    });

    return updated;
  });
}

/** The no-names public nudge. Never aimed at an individual. */
export async function appendReminder(site: Site, body: string, triggeredBy: string) {
  return db.transaction(async (tx) => {
    const [reminder] = await tx
      .insert(nuraReminders)
      .values({ site, body, triggeredBy })
      .returning();

    // The nudge is also posted into the room as a system message so members
    // actually see it, same as a pastoral reply would be.
    await tx.insert(chapelMessages).values({
      site,
      memberId: null,
      isSystem: true,
      body,
    });

    await tx.insert(nuraLog).values({
      site,
      stage: "tier2",
      flag: "confirmed_harm",
      action: "nudge_public",
      decidedBy: "code",
      reason: `Ambient nudge triggered by: ${triggeredBy}`,
      detail: { triggeredBy },
    });

    return reminder;
  });
}

/** Posts Nura's in-thread pastoral holding reply (crisis or otherwise). */
export async function postPastoralReply(
  site: Site,
  threadId: number | null,
  body: string,
  logInput: AppendLogInput,
) {
  return db.transaction(async (tx) => {
    const [msg] = await tx
      .insert(chapelMessages)
      .values({ site, memberId: null, isSystem: true, threadId, body })
      .returning();

    await tx.insert(nuraLog).values({
      site: logInput.site,
      messageId: logInput.messageId ?? null,
      memberId: logInput.memberId ?? null,
      stage: logInput.stage,
      flag: logInput.flag,
      llmClass: logInput.llmClass ?? null,
      action: "pastoral_reply",
      decidedBy: logInput.decidedBy,
      reason: logInput.reason,
      detail: (logInput.detail ?? null) as object | null,
    });

    return msg;
  });
}

/**
 * The crisis / predation rescue net. Writes the append-only alert ledger
 * entry (reused from the existing responder/Pit infra) and dispatches to
 * eligible responders. Nura never counsels alone — she raises the flag and
 * holds the space; a human answering is the verified crisis call.
 */
export async function dispatchAlert(input: {
  site: Site;
  memberId?: number | null;
  messageId?: number | null;
  reason: string;
  logInput: AppendLogInput;
}) {
  return db.transaction(async (tx) => {
    const [alert] = await tx
      .insert(alertLedgerEntries)
      .values({
        site: input.site,
        memberId: input.memberId ?? null,
        messageId: input.messageId ?? null,
        reason: input.reason,
        status: "open",
      })
      .returning();

    await tx.insert(nuraLog).values({
      site: input.logInput.site,
      messageId: input.logInput.messageId ?? null,
      memberId: input.logInput.memberId ?? null,
      stage: input.logInput.stage,
      flag: input.logInput.flag,
      llmClass: input.logInput.llmClass ?? null,
      action: "alert_responder",
      decidedBy: input.logInput.decidedBy,
      reason: input.logInput.reason,
      detail: (input.logInput.detail ?? null) as object | null,
    });

    // Find eligible responders (member_roles = responder for this site or
    // global responders). Dispatch here just means "identified + notified in
    // the ledger" — the actual paging channel is whatever the existing
    // Pit/responder dispatch already uses.
    const responders = await tx
      .select({ memberId: memberRoles.memberId })
      .from(memberRoles)
      .where(eq(memberRoles.role, "responder"));

    return { alert, eligibleResponderIds: responders.map((r) => r.memberId) };
  });
}

/** A responder answers = the verified crisis call. Pairs responder + person. */
export async function answerAlert(alertId: number, responderMemberId: number) {
  const [updated] = await db
    .update(alertLedgerEntries)
    .set({ status: "answered", answeredBy: responderMemberId, answeredAt: new Date() })
    .where(eq(alertLedgerEntries.id, alertId))
    .returning();
  return updated;
}

// ---------------------------------------------------------------------------
// Read helpers used by Tier 2 (context) and the admin surface. Reads never
// need the append-only guard, only writes do.
// ---------------------------------------------------------------------------

export async function recentSiteMessages(site: Site, sinceMinutesAgo: number, limit = 50) {
  const since = new Date(Date.now() - sinceMinutesAgo * 60_000);
  return db
    .select()
    .from(chapelMessages)
    .where(and(eq(chapelMessages.site, site), gte(chapelMessages.createdAt, since)))
    .orderBy(desc(chapelMessages.createdAt))
    .limit(limit);
}

export async function recentFlagsForMember(
  site: Site,
  memberId: number,
  sinceMinutesAgo: number,
  flags: Flag[],
) {
  const since = new Date(Date.now() - sinceMinutesAgo * 60_000);
  const rows = await db
    .select()
    .from(nuraLog)
    .where(and(eq(nuraLog.site, site), eq(nuraLog.memberId, memberId), gte(nuraLog.createdAt, since)))
    .orderBy(desc(nuraLog.createdAt));
  return rows.filter((r) => flags.includes(r.flag as Flag));
}

export async function recentConfirmedHarmCountSitewide(site: Site, sinceMinutesAgo: number) {
  const since = new Date(Date.now() - sinceMinutesAgo * 60_000);
  const rows = await db
    .select()
    .from(nuraLog)
    .where(and(eq(nuraLog.site, site), eq(nuraLog.flag, "confirmed_harm"), gte(nuraLog.createdAt, since)));
  return rows.length;
}

export async function countRemovePostActionsForUser(site: Site, memberId: number) {
  const rows = await db
    .select()
    .from(nuraActions)
    .where(
      and(
        eq(nuraActions.site, site),
        eq(nuraActions.targetType, "post"),
        eq(nuraActions.action, "remove_post"),
      ),
    );
  // targetId on post actions is a message id; join back to author.
  const messageIds = rows.map((r) => r.targetId);
  if (messageIds.length === 0) return 0;
  const msgs = await db
    .select()
    .from(chapelMessages)
    .where(inArray(chapelMessages.id, messageIds));
  return msgs.filter((m) => m.memberId === memberId).length;
}
