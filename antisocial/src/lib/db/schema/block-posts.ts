import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { members } from "./members";

/**
 * PORTED from docs/salvaged/original-upload-reference.txt this session.
 * Only rename applied: blockMembers -> members (see members.ts note).
 * No tier-name changes needed here — "block" in "blockPosts" refers to the
 * Block Posts feed itself (community feed), not the Block tier directly,
 * though access to it IS gated at Block tier via requireBlockAccess.
 */

export const blockPostStatusEnum = pgEnum("block_post_status", [
  "published",
  "flagged",
  "removed",
]);

export const blockPosts = pgTable(
  "block_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(), // validated against a fixed enum in the API layer
    title: text("title").notNull(),
    body: text("body").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    status: blockPostStatusEnum("status").notNull().default("published"),
    cheerCount: integer("cheer_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    feedOrderIdx: index("block_posts_feed_idx").on(t.createdAt),
    sectionIdx: index("block_posts_section_idx").on(t.sectionKey, t.createdAt),
  })
);

export const blockPostReplies = pgTable(
  "block_post_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blockPosts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    postOrderIdx: index("block_post_replies_post_idx").on(t.postId, t.createdAt),
  })
);

export const blockPostCheers = pgTable(
  "block_post_cheers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blockPosts.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    onePerMember: uniqueIndex("block_post_cheers_uq").on(t.postId, t.memberId),
  })
);
