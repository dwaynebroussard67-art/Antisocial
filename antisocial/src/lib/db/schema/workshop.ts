import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { members } from "./members";

/**
 * PORTED from docs/salvaged/original-upload-reference.txt this session.
 * Rename applied: blockMembers -> members. No tier-cascade renames needed
 * inside this file itself (that lives in the access-check call sites, see
 * src/lib/workshop/volunteers.ts and the API routes).
 *
 * NOTE on the `sql` import: this project's drizzle-orm version exports
 * `sql` from the top-level "drizzle-orm" package, not "drizzle-orm/pg-core"
 * (the salvage's original import was wrong for this version — same bug
 * HANDOFF-16 flagged and fixed in block-posts.ts). Fixed here from the start.
 */

export const workshopProjectStatusEnum = pgEnum("workshop_project_status", [
  "planning",
  "active",
  "completed",
  "paused",
]);

export const workshopVolunteerStatusEnum = pgEnum("workshop_volunteer_status", ["active", "left"]);

export const workshopProjects = pgTable(
  "workshop_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    missionStatement: text("mission_statement").notNull(),
    description: text("description").notNull(),
    status: workshopProjectStatusEnum("status").notNull().default("planning"),
    progressPercent: integer("progress_percent").notNull().default(0),
    coverPhotoUrls: text("cover_photo_urls").array().notNull().default(sql`'{}'::text[]`),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => members.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("workshop_projects_status_idx").on(t.status, t.createdAt),
  })
);

export const workshopVolunteers = pgTable(
  "workshop_volunteers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => workshopProjects.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    role: text("role"),
    status: workshopVolunteerStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    oneRowPerMember: uniqueIndex("workshop_volunteers_project_member_uq").on(t.projectId, t.memberId),
  })
);

export const workshopUpdates = pgTable(
  "workshop_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => workshopProjects.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => members.id),
    body: text("body").notNull(),
    photoUrls: text("photo_urls").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    projectOrderIdx: index("workshop_updates_project_idx").on(t.projectId, t.createdAt),
  })
);

export const workshopDiscussionComments = pgTable(
  "workshop_discussion_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => workshopProjects.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => members.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    projectOrderIdx: index("workshop_comments_project_idx").on(t.projectId, t.createdAt),
  })
);
