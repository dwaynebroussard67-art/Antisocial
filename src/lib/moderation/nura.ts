import { db } from "@/lib/db";
import { members } from "@/lib/db/schema/members";
import { memberRoles } from "@/lib/db/schema/member-roles";
import {
  contentQuarantine,
  nuraActions,
  memberBans,
} from "@/lib/db/schema/nura-moderation";
import { notifyMember } from "@/lib/notifications/notify";
import { getClassifier } from "./nura-classifier";
import { resolveBand, CATEGORIES, type Band, type CategoryKey } from "./nura-bands";
import { and, eq, isNull, inArray } from "drizzle-orm";

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
    .select({ memberId: memberRoles.memberId })
    .from(memberRoles)
    .where(inArray(memberRoles.siteRole, ["admin", "moderator"]));

  const categoryNote = `Nura wasn't sure (${score}/100). Held and hidden pending review.`;

  await Promise.all(
    staff.map((s) =>
      notifyMember({
        memberId: s.memberId,
        type: "system",
        title: "Held for review",
        body: categoryNote,
        linkUrl: `/moderation/quarantine/${quarantineId}`,
      })
    )
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
