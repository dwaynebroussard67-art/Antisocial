import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { members } from "./members";

/**
 * TIER CHANGES FROM THE SALVAGED VERSION:
 * - "house" renamed to "crib" (per your direction — not changing the meaning,
 *   just the name).
 * - "pit" added as the fourth tier. The original code had a comment saying a
 *   "responder" tier was deliberately left out, reserved for a gated
 *   "Section 19" — that gate is the Pit. This is that tier.
 *
 * ACCESS IS CASCADING, NOT SILOED (per your instructions):
 *   pit    -> sees pit, crib, block, street
 *   crib   -> sees crib, block, street
 *   block  -> sees block, street
 *   street -> sees street only
 * The rank numbers below encode that cascade — see lib/auth/roles.ts for
 * the actual access-check logic.
 */
export const memberTierEnum = pgEnum("member_tier", ["street", "block", "crib", "pit"]);
export const siteRoleEnum = pgEnum("site_role", ["member", "moderator", "admin"]);

export const memberRoles = pgTable("member_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" })
    .unique(),

  tier: memberTierEnum("tier").notNull().default("street"),
  siteRole: siteRoleEnum("site_role").notNull().default("member"),

  // Pit access specifically means "is an active Misfit First Responder /
  // Narcan Watch member." Kept as an explicit boolean (not inferred from
  // tier alone) because Pit access can be revoked independently of tier —
  // e.g. someone stays "Crib" in every other sense but steps back from
  // being on-call, or vice versa.
  isMisfitFirstResponder: boolean("is_misfit_first_responder").notNull().default(false),
  responderActivatedAt: timestamp("responder_activated_at", { withTimezone: true }),
  responderQrCode: text("responder_qr_code"), // the code scanned off the Narcan dose

  cribGrantedAt: timestamp("crib_granted_at", { withTimezone: true }),
  cribGrantedBy: uuid("crib_granted_by").references(() => members.id),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const badges = pgTable("badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  // Which tier's game/leaderboard this badge belongs to, if any. Nullable —
  // most badges (workshop, doctrine study) aren't tier-scoped.
  tierScope: memberTierEnum("tier_scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberBadges = pgTable(
  "member_badges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    sourceEvent: text("source_event").notNull(),
  },
  (t) => ({
    onePerMember: uniqueIndex("member_badges_member_badge_uq").on(t.memberId, t.badgeId),
  })
);

export const memberEvents = pgTable("member_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
