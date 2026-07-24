import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { members } from "./members";

/**
 * NURA'S MODERATION AUTHORITY (D's correction, this session).
 *
 * The standing handoff put NURA's reasoning out of scope. D overrode that
 * for one specific power: hate speech and disciplinary action. In D's words —
 * she has final authority, she doesn't need permission, and if she even
 * thinks something's happening she quarantines it.
 *
 * The doctrine these tables encode:
 *
 *  QUARANTINE FIRST, ALWAYS. Any suspicion at all pulls the content out of
 *  sight before anything else happens. Quarantine is not a punishment and
 *  not a verdict — it's the pause button, and it costs nothing to press.
 *
 *  THE SENDER IS NEVER TOLD. Not at quarantine, not during review. They may
 *  have worded something badly, or Nura may have misread them; either way
 *  nothing is said while it's being worked out. There is no "your message
 *  was held" notice anywhere in this system by design.
 *
 *  BAND A — obvious. Hate speech, evil-worship, glorifying evil, past the
 *  line where there's nothing to weigh. Content removed, account removed.
 *  No warning, no questions, no human in the loop first.
 *
 *  BAND B — uncertain. Content stays quarantined and invisible. D or a staff
 *  member gets alerted. A human decides. The sender still hears nothing.
 *
 * On the audit tables below: D asked for no appeal and no warning in the
 * user-facing flow, and that's what's built. `nura_actions` and
 * `member_bans.reversed_at` exist on the staff side only — nobody is
 * notified, nothing is promised to anyone, and no reversal happens on its
 * own. They're here so that if Nura is ever wrong, the mistake is findable
 * and undoable by a human rather than silent and permanent.
 */

/** Where the classifier landed. Ordered least to most severe. */
export const nuraVerdictEnum = pgEnum("nura_verdict", [
  "clear",              // nothing to act on
  "band_b_uncertain",   // quarantine + alert a human
  "band_a_violation",   // quarantine + remove + ban, automatically
]);

export const quarantineStatusEnum = pgEnum("quarantine_status", [
  "quarantined",  // held, invisible, awaiting a human (Band B) or already actioned (Band A)
  "released",     // a human cleared it — content goes live
  "upheld",       // a human confirmed the violation
]);

export const nuraActionKindEnum = pgEnum("nura_action_kind", [
  "quarantine",
  "auto_remove",
  "auto_ban",
  "staff_alert",
  "human_release",
  "human_uphold",
  "ban_reversed",
]);

/**
 * The held content itself.
 *
 * `capturedBody` is a COPY of what was said, kept here on purpose. The
 * source row may be removed outright in a Band A action, and a review that
 * can't see what it's reviewing is not a review. This is the evidence.
 */
export const contentQuarantine = pgTable(
  "content_quarantine",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // "block_post" | "block_reply" | "signal_message" | future feature keys.
    contentType: text("content_type").notNull(),
    contentId: uuid("content_id").notNull(),

    authorId: uuid("author_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),

    capturedBody: text("captured_body").notNull(),

    verdict: nuraVerdictEnum("verdict").notNull(),
    // 0-100. The band cut lines live in lib/moderation/nura-bands.ts.
    score: integer("score").notNull(),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    // Why the classifier said what it said — whatever the classifier can
    // show its work with. Free-form so swapping the classifier doesn't
    // need a migration.
    rationale: jsonb("rationale").notNull().default({}),

    status: quarantineStatusEnum("status").notNull().default("quarantined"),

    // Set only when a HUMAN resolves a Band B hold. Band A rows are actioned
    // by Nura and stay unreviewed unless someone goes looking.
    reviewedBy: uuid("reviewed_by").references(() => members.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // The staff review queue: open holds, oldest first.
    queueIdx: index("content_quarantine_queue_idx").on(t.status, t.createdAt),
    contentIdx: index("content_quarantine_content_idx").on(t.contentType, t.contentId),
    authorIdx: index("content_quarantine_author_idx").on(t.authorId),
  })
);

/**
 * Append-only log of everything Nura did and everything a human did after
 * her. Never updated, never deleted — if she acts wrongly, this is where
 * that becomes visible.
 */
export const nuraActions = pgTable(
  "nura_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actionKind: nuraActionKindEnum("action_kind").notNull(),

    subjectMemberId: uuid("subject_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),

    quarantineId: uuid("quarantine_id").references(() => contentQuarantine.id, {
      onDelete: "set null",
    }),

    verdict: nuraVerdictEnum("verdict"),
    score: integer("score"),

    // Null actor = Nura acted on her own authority, which is the normal case
    // for quarantine/auto_remove/auto_ban. Set for human actions.
    actorMemberId: uuid("actor_member_id").references(() => members.id),

    detail: jsonb("detail").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    subjectIdx: index("nura_actions_subject_idx").on(t.subjectMemberId, t.createdAt),
    kindIdx: index("nura_actions_kind_idx").on(t.actionKind, t.createdAt),
  })
);

/**
 * Removal from the site. One row per ban.
 *
 * A Band A ban is written by Nura with `bannedBy` null — she needs nobody's
 * permission and the record reflects that honestly rather than attributing
 * it to a staff member who wasn't involved.
 */
export const memberBans = pgTable(
  "member_bans",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),

    // Null = Nura, acting automatically.
    bannedBy: uuid("banned_by").references(() => members.id),

    reason: text("reason").notNull(),
    verdict: nuraVerdictEnum("verdict"),
    quarantineId: uuid("quarantine_id").references(() => contentQuarantine.id, {
      onDelete: "set null",
    }),

    bannedAt: timestamp("banned_at", { withTimezone: true }).notNull().defaultNow(),

    // Staff-only, never automatic, never promised to the banned person.
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedBy: uuid("reversed_by").references(() => members.id),
    reversalNotes: text("reversal_notes"),
  },
  (t) => ({
    // "Is this member currently banned" — the hot path, checked on sign-in.
    memberActiveIdx: index("member_bans_member_idx").on(t.memberId, t.reversedAt),
  })
);
