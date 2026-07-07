import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { members } from "./members";

/**
 * PORTED from docs/salvaged/original-upload-reference.txt this session.
 * Only rename applied: blockMembers -> members (see members.ts note).
 * Tier-cascade renames don't touch this file — moderation isn't tier-gated,
 * it's site-role-gated (moderator/admin, via requireSiteRole in roles.ts).
 */

export const moderationFlagStatusEnum = pgEnum("moderation_flag_status", [
  "pending",
  "reviewing",
  "actioned",
  "dismissed",
]);

export const moderationFlags = pgTable("moderation_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentType: text("content_type").notNull(), // "block_post" | "block_reply" | future feature keys
  contentId: uuid("content_id").notNull(),
  reason: text("reason").notNull(),
  reportedBy: uuid("reported_by").references(() => members.id),
  status: moderationFlagStatusEnum("status").notNull().default("pending"),
  reviewerId: uuid("reviewer_id").references(() => members.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
