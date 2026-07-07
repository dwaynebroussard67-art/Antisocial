import { pgTable, uuid, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { members } from "./members";

// PORTED from salvage. Only rename applied: blockMembers -> members.

export const notificationTypeEnum = pgEnum("notification_type", [
  "reply",
  "mention",
  "badge_awarded",
  "quest_ready",
  "mission_signup_filled",
  "workshop_update",
  "system",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    linkUrl: text("link_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    memberIdx: index("notifications_member_idx").on(t.memberId, t.readAt, t.createdAt),
  })
);

// One row per member — "online now" is derived from freshness of lastSeenAt,
// not a boolean flag, which would require a disconnect event we have no
// reliable way to detect (browser close, network drop, etc. don't fire one).
export const memberPresence = pgTable("member_presence", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});
