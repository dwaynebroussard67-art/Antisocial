import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { members } from "./members";

/**
 * PORTED from docs/salvaged/original-upload-reference.txt this session.
 * Renames applied: blockMembers -> members. requireHouseAccess (create-need
 * gate) becomes requireCribAccess — see src/app/api/mission-board/needs/route.ts.
 * Signup/cancel stay Block-tier, same as the salvage (any verified member
 * can sign up for a need; only Crib+ can post one).
 */

export const missionNeedCategoryEnum = pgEnum("mission_need_category", [
  "service",
  "skills",
  "logistics",
  "administrative",
  "creative",
  "other",
]);

export const missionNeedStatusEnum = pgEnum("mission_need_status", ["open", "cancelled"]);
export const missionSignupStatusEnum = pgEnum("mission_signup_status", ["active", "cancelled"]);

export const missionBoardNeeds = pgTable(
  "mission_board_needs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: missionNeedCategoryEnum("category").notNull(),
    isVirtual: boolean("is_virtual").notNull().default(false),
    location: text("location"), // null when isVirtual = true
    slotsNeeded: integer("slots_needed").notNull(),
    deadline: timestamp("deadline", { withTimezone: true }), // null = ongoing, no deadline
    status: missionNeedStatusEnum("status").notNull().default("open"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => members.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("mission_needs_status_idx").on(t.status, t.deadline),
  })
);

export const missionBoardSignups = pgTable(
  "mission_board_signups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    needId: uuid("need_id")
      .notNull()
      .references(() => missionBoardNeeds.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    status: missionSignupStatusEnum("status").notNull().default("active"),
    signedUpAt: timestamp("signed_up_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => ({
    needMemberIdx: index("mission_signups_need_member_idx").on(t.needId, t.memberId),
  })
);
