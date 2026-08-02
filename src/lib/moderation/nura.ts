import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";
import {
  contentQuarantine,
  nuraActions,
  memberBans,
} from "@/lib/db/schema/nura-moderation";
import { notifyMember } from "@/lib/notifications/notify";
import { sendEmail } from "@/lib/notifications/email";
import { getClassifier } from "./nura-classifier";
import { resolveBand, CATEGORIES, type Band, type CategoryKey } from "./nura-bands";
import { blockPosts, blockPostReplies } from "@/lib/db/schema/block-posts";
import { signalMessages, signalRooms } from "@/lib/db/schema/signal";
import { and, eq, isNull, inArray, sql } from "drizzle-orm";

/**
 * NURA'S ENFORCEMENT PATH.
 *
 * One entry point — `screenContent` — called by every route that accepts
 * something a person wrote. It returns a decision the caller must honour;
 * it does not itself write the post.
 *
 * THE ONE RULE THAT SHAPES EVERY SIGNATURE IN THIS FILE: the sender is never
 * told. Not on quarantine, not during review, not on Band A removal. That
 * means callers must not be able to accidentally leak the decision into a
 * response body, so `ScreenResult.publish` is a plain boolean the caller
 * uses to decide whether the row goes out — and every caller returns its
 * normal success response either way.
 *
 * See docs/HANDOFF-36.md for the doctrine this implements.
 */

export type ScreenableContent = {
  contentType: "block_post" | "block_reply" | "signal_message";
  contentId: string;
  authorId: string;
  text: string;
};

export type ScreenResult = {
  /**
   * false = quarantined. The caller must keep this content out of every
   * feed, room and query. The caller must ALSO respond to the author
   * exactly as it would on success.
   */
  publish: boolean;
  band: Band;
  quarantineId: string | null;
  /** True when the author was removed from the site by this call. */
  banned: boolean;
};

/**
 * Screen one piece of content and enforce whatever Nura decides.
 *
 * Call this AFTER the row exists (so there's an id to quarantine) and
 * BEFORE it becomes visible to anyone.
 */
export async function screenContent(content: ScreenableContent): Promise<ScreenResult> {
  let classification;
  try {
    classification = await getClassifier().classify({
      text: content.text,
      authorId: content.authorId,
      contentType: content.contentType,
    });
  } catch (err) {
    // FAIL CLOSED, QUIETLY. If Nura can't read it, nobody else does either
    // until a human has. A classifier outage must not become an open door.
    console.error("[nura:classify] classifier threw — failing closed", err);
    classification = {
      score: 100,
      categories: ["other" as CategoryKey],
      rationale: { error: "classifier_unavailable", failedClosed: true },
    };
    // Forced to Band B rather than Band A: an outage is not evidence of
    // wrongdoing, so it holds the content and calls a human. It never bans.
    const quarantineId = await quarantine(content, "band_b_uncertain", classification);
    await alertStaff(content, quarantineId, "band_b_uncertain", classification.score);
    return { publish: false, band: "band_b_uncertain", quarantineId, banned: false };
  }

  const band = resolveBand(classification.score, classification.categories);

  if (band === "clear") {
    return { publish: true, band, quarantineId: null, banned: false };
  }

  // QUARANTINE FIRST — both bands, before anything else happens.
  // "She quarantines the message to make sure nobody gets to see it."
  const quarantineId = await quarantine(content, band, classification);

  if (band === "band_b_uncertain") {
    // Unsure. Hold it, wake a human, tell the sender nothing.
    await alertStaff(content, quarantineId, band, classification.score);
    return { publish: false, band, quarantineId, banned: false };
  }

  // BAND A. Obvious. No warning, no questions, no permission needed.
  await removeAndBan(content, quarantineId, classification);
  return { publish: false, band, quarantineId, banned: true };
}

async function quarantine(
  content: ScreenableContent,
  band: Band,
  classification: { score: number; categories: CategoryKey[]; rationale: Record<string, unknown> }
): Promise<string> {
  const [row] = await db
    .insert(contentQuarantine)
    .values({
      contentType: content.contentType,
      contentId: content.contentId,
      authorId: content.authorId,
      // A copy, not a reference — Band A deletes the source and a review
      // with nothing to read is not a review.
      capturedBody: content.text,
      verdict: band === "band_a_violation" ? "band_a_violation" : "band_b_uncertain",
      score: classification.score,
      categories: classification.categories,
      rationale: classification.rationale,
      status: "quarantined",
    })
    .returning({ id: contentQuarantine.id });

  await db.insert(nuraActions).values({
    actionKind: "quarantine",
    subjectMemberId: content.authorId,
    quarantineId: row.id,
    verdict: band === "band_a_violation" ? "band_a_violation" : "band_b_uncertain",
    score: classification.score,
    actorMemberId: null, // Nura, on her own authority.
    detail: { contentType: content.contentType, contentId: content.contentId },
  });

  return row.id;
}

/**
 * Band B: get a human. D or a staff member — "she alerts me or she alerts
 * a staff member."
 *
 * Notifications go to every admin and moderator. The alert deliberately does
 * NOT quote the content: the queue holds it, and a notification body is the
 * one place this text could end up rendered somewhere it shouldn't be.
 */
async function alertStaff(
  content: ScreenableContent,
  quarantineId: string,
  band: Band,
  score: number
): Promise<void> {
  const staff = await db
    .select({ memberId: memberRoles.memberId, email: members.email })
    .from(memberRoles)
    .innerJoin(members, eq(members.id, memberRoles.memberId))
    .where(inArray(memberRoles.siteRole, ["admin", "moderator"]));

  const categoryNote = `Nura wasn't sure (${score}/100). Held and hidden pending review.`;
  const reviewPath = `/moderation/quarantine/${quarantineId}`;
  const appUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") || "";

  await Promise.all(
    staff.map(async (s) => {
      await notifyMember({
        memberId: s.memberId,
        type: "system",
        title: "Held for review",
        body: categoryNote,
        linkUrl: reviewPath,
      });
      // In-app notification alone assumes someone is looking at the app.
      // Email is the pipe that actually reaches a phone off Wi-Fi with no
      // mobile data. See docs/HANDOFF-37 §4.
      if (s.email) {
        await sendEmail({
          to: s.email,
          subject: "Nura: held for review",
          text: `${categoryNote}\n\n${appUrl}${reviewPath}`,
        });
      }
    })
  );

  await db.insert(nuraActions).values({
    actionKind: "staff_alert",
    subjectMemberId: content.authorId,
    quarantineId,
    verdict: "band_b_uncertain",
    score,
    actorMemberId: null,
    detail: { alerted: staff.length, band },
  });

  if (staff.length === 0) {
    // Loud, because a Band B hold with nobody to review it sits invisible
    // forever, which is the failure mode this whole path is meant to avoid.
    console.error(
      `[nura:alert] quarantine ${quarantineId} has NO staff to alert — no admin/moderator exists`
    );
  }
}

/**
 * Band A: the content goes, the person goes. Immediately, automatically.
 *
 * The ban row and the audit rows are written here. Nobody is notified —
 * not the author (D: no warnings, no questions asked) and not staff, because
 * Nura didn't need them for this one. It is all recorded.
 */
async function removeAndBan(
  content: ScreenableContent,
  quarantineId: string,
  classification: { score: number; categories: CategoryKey[] }
): Promise<void> {
  const reason = classification.categories
    .map((c) => CATEGORIES[c]?.label ?? c)
    .join(", ");

  await db.insert(nuraActions).values({
    actionKind: "auto_remove",
    subjectMemberId: content.authorId,
    quarantineId,
    verdict: "band_a_violation",
    score: classification.score,
    actorMemberId: null,
    detail: { contentType: content.contentType, contentId: content.contentId },
  });

  // Idempotent: if this member is already under an unreversed ban, don't
  // stack a second one. Re-banning an already-banned account would just
  // make the ledger harder to read.
  const [existing] = await db
    .select({ id: memberBans.id })
    .from(memberBans)
    .where(and(eq(memberBans.memberId, content.authorId), isNull(memberBans.reversedAt)))
    .limit(1);

  if (!existing) {
    await db.insert(memberBans).values({
      memberId: content.authorId,
      bannedBy: null, // Nura. She needed nobody's permission and the record says so.
      reason,
      verdict: "band_a_violation",
      quarantineId,
    });

    await db.insert(nuraActions).values({
      actionKind: "auto_ban",
      subjectMemberId: content.authorId,
      quarantineId,
      verdict: "band_a_violation",
      score: classification.score,
      actorMemberId: null,
      detail: { reason },
    });
  }
}

/**
 * Is this member currently removed from the site?
 * Checked on session resolution — a banned account gets no viewer.
 */
export async function isBanned(memberId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: memberBans.id })
    .from(memberBans)
    .where(and(eq(memberBans.memberId, memberId), isNull(memberBans.reversedAt)))
    .limit(1);
  return Boolean(row);
}

/**
 * Put released content back where it belongs.
 *
 * Every quarantine path has a side effect that had to be suppressed to keep
 * the hold silent (see HANDOFF-36): a post is written `quarantined` rather
 * than published, a reply doesn't increment `replyCount`, a Signal message
 * doesn't bump its room's `updatedAt`. Releasing has to undo ALL of them,
 * not just the status — otherwise "release" marks the quarantine row
 * resolved while the content stays invisible forever, and the review queue
 * quietly becomes a place where content goes to die.
 */
async function republish(contentType: string, contentId: string): Promise<void> {
  if (contentType === "block_post") {
    await db.update(blockPosts).set({ status: "published" }).where(eq(blockPosts.id, contentId));
    return;
  }

  if (contentType === "block_reply") {
    const [reply] = await db
      .update(blockPostReplies)
      .set({ status: "published" })
      .where(eq(blockPostReplies.id, contentId))
      .returning({ postId: blockPostReplies.postId });

    // The counter was held back at screening time; catch it up now, or the
    // reply renders under a post claiming one fewer reply than it has.
    if (reply) {
      await db
        .update(blockPosts)
        .set({ replyCount: sql`${blockPosts.replyCount} + 1` })
        .where(eq(blockPosts.id, reply.postId));
    }
    return;
  }

  if (contentType === "signal_message") {
    const [message] = await db
      .update(signalMessages)
      .set({ quarantinedAt: null })
      .where(eq(signalMessages.id, contentId))
      .returning({ roomId: signalMessages.roomId });

    // Deliberately suppressed at screening time so the room didn't jump to
    // the top of everyone's list with nothing visible in it. Now there IS
    // something to see, so the room should surface normally.
    if (message) {
      await db
        .update(signalRooms)
        .set({ updatedAt: new Date() })
        .where(eq(signalRooms.id, message.roomId));
    }
    return;
  }

  // A content type nobody taught this function about. Loud, because the
  // silent version is a released item that never comes back.
  console.error(
    `[nura:republish] unknown contentType "${contentType}" (id ${contentId}) — content NOT restored`
  );
}

/**
 * Staff resolution of a Band B hold. Human only — there is no automatic
 * release path anywhere in this file, deliberately.
 *
 * Releasing does not notify the author either. From their side nothing ever
 * happened, which is the point: they were never accused of anything.
 */
export async function resolveQuarantine(params: {
  quarantineId: string;
  reviewerId: string;
  decision: "release" | "uphold";
  notes?: string;
}): Promise<void> {
  const [row] = await db
    .select()
    .from(contentQuarantine)
    .where(eq(contentQuarantine.id, params.quarantineId))
    .limit(1);

  if (!row) throw new Error(`resolveQuarantine: no quarantine ${params.quarantineId}`);
  if (row.status !== "quarantined") return; // already resolved, nothing to do

  await db
    .update(contentQuarantine)
    .set({
      status: params.decision === "release" ? "released" : "upheld",
      reviewedBy: params.reviewerId,
      reviewedAt: new Date(),
      reviewNotes: params.notes ?? null,
    })
    .where(eq(contentQuarantine.id, params.quarantineId));

  if (params.decision === "release") {
    await republish(row.contentType, row.contentId);
  }

  await db.insert(nuraActions).values({
    actionKind: params.decision === "release" ? "human_release" : "human_uphold",
    subjectMemberId: row.authorId,
    quarantineId: params.quarantineId,
    verdict: row.verdict,
    score: row.score,
    actorMemberId: params.reviewerId,
    detail: { notes: params.notes ?? null },
  });
}

/**
 * Staff reversal of a ban. Exists so a wrong call by Nura is recoverable by
 * a human — it is never automatic, never triggered by the banned person, and
 * nothing in the user-facing flow promises or mentions it.
 */
export async function reverseBan(params: {
  memberId: string;
  reversedBy: string;
  notes?: string;
}): Promise<void> {
  await db
    .update(memberBans)
    .set({ reversedAt: new Date(), reversedBy: params.reversedBy, reversalNotes: params.notes ?? null })
    .where(and(eq(memberBans.memberId, params.memberId), isNull(memberBans.reversedAt)));

  await db.insert(nuraActions).values({
    actionKind: "ban_reversed",
    subjectMemberId: params.memberId,
    actorMemberId: params.reversedBy,
    detail: { notes: params.notes ?? null },
  });
}

/**
 * One held item, for the review page. Returns everything a human needs to
 * make the call and nothing they don't.
 */
export async function getQuarantine(quarantineId: string) {
  const [row] = await db
    .select({
      id: contentQuarantine.id,
      contentType: contentQuarantine.contentType,
      capturedBody: contentQuarantine.capturedBody,
      verdict: contentQuarantine.verdict,
      score: contentQuarantine.score,
      categories: contentQuarantine.categories,
      rationale: contentQuarantine.rationale,
      status: contentQuarantine.status,
      createdAt: contentQuarantine.createdAt,
      reviewedAt: contentQuarantine.reviewedAt,
      reviewNotes: contentQuarantine.reviewNotes,
      authorId: contentQuarantine.authorId,
      authorName: members.displayName,
      authorEmail: members.email,
    })
    .from(contentQuarantine)
    .innerJoin(members, eq(members.id, contentQuarantine.authorId))
    .where(eq(contentQuarantine.id, quarantineId))
    .limit(1);

  return row ?? null;
}

// Referenced by the staff queue UI when it lands; exported now so the
// members import isn't unused and the join is written once, correctly.
export async function listOpenQuarantine(limit = 50) {
  return db
    .select({
      id: contentQuarantine.id,
      contentType: contentQuarantine.contentType,
      capturedBody: contentQuarantine.capturedBody,
      score: contentQuarantine.score,
      categories: contentQuarantine.categories,
      createdAt: contentQuarantine.createdAt,
      authorName: members.displayName,
    })
    .from(contentQuarantine)
    .innerJoin(members, eq(members.id, contentQuarantine.authorId))
    .where(eq(contentQuarantine.status, "quarantined"))
    .orderBy(contentQuarantine.createdAt)
    .limit(limit);
}
