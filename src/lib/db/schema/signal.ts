import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { members } from "@/lib/db/schema/members";

export const signalRooms = pgTable(
  "signal_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type", {
      enum: ["direct", "group", "protected", "mission", "prayer", "witness", "pit-watch"] as const,
    }).notNull(),
    trustFloor: text("trust_floor", {
      enum: ["street", "block", "crib", "pit"] as const,
    }).notNull().default("street"),
    isPrivate: boolean("is_private").notNull().default(true),
    witnessDefault: boolean("witness_default").notNull().default(false),
    createdByMemberId: uuid("created_by_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex("signal_rooms_slug_unique").on(t.slug),
    typeIdx: index("signal_rooms_type_idx").on(t.type),
    trustIdx: index("signal_rooms_trust_idx").on(t.trustFloor),
  }),
);

export const signalRoomMembers = pgTable(
  "signal_room_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => signalRooms.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "moderator", "member", "guest"] as const }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    canPost: boolean("can_post").notNull().default(true),
    canReply: boolean("can_reply").notNull().default(true),
    muted: boolean("muted").notNull().default(false),
    boundaryOnly: boolean("boundary_only").notNull().default(false),
    lastReadMessageId: uuid("last_read_message_id"),
  },
  (t) => ({
    uniqueRoomMember: uniqueIndex("signal_room_members_unique").on(t.roomId, t.memberId),
    roomIdx: index("signal_room_members_room_idx").on(t.roomId),
    memberIdx: index("signal_room_members_member_idx").on(t.memberId),
  }),
);

export const signalMessages = pgTable(
  "signal_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => signalRooms.id, { onDelete: "cascade" }),
    senderMemberId: uuid("sender_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    parentMessageId: uuid("parent_message_id").references((): AnyPgColumn => signalMessages.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["text", "voice", "image", "video", "burn", "pulse", "check-in", "mark"] as const,
    }).notNull().default("text"),
    body: text("body"),
    voiceUrl: text("voice_url"),
    transcript: text("transcript"),
    visibility: text("visibility", {
      enum: ["keep", "fade", "seal", "burn"] as const,
    }).notNull().default("keep"),
    witnessMode: boolean("witness_mode").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => ({
    roomIdx: index("signal_messages_room_idx").on(t.roomId),
    senderIdx: index("signal_messages_sender_idx").on(t.senderMemberId),
    parentIdx: index("signal_messages_parent_idx").on(t.parentMessageId),
    createdIdx: index("signal_messages_created_idx").on(t.createdAt),
  }),
);

export const signalRequests = pgTable(
  "signal_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromMemberId: uuid("from_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    toMemberId: uuid("to_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => signalRooms.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["front-porch", "check-in", "repair", "mission", "prayer"] as const,
    }).notNull(),
    status: text("status", {
      enum: ["pending", "accepted", "rejected", "muted", "redirected"] as const,
    }).notNull().default("pending"),
    prompt: text("prompt"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => ({
    uniqueRequest: uniqueIndex("signal_requests_unique").on(t.fromMemberId, t.toMemberId, t.type),
    fromIdx: index("signal_requests_from_idx").on(t.fromMemberId),
    toIdx: index("signal_requests_to_idx").on(t.toMemberId),
    statusIdx: index("signal_requests_status_idx").on(t.status),
  }),
);

export const signalMarks = pgTable(
  "signal_marks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => signalMessages.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    mark: text("mark", {
      enum: ["heard", "with-you", "praying", "solid", "check-in"] as const,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueMark: uniqueIndex("signal_marks_unique").on(t.messageId, t.memberId, t.mark),
    messageIdx: index("signal_marks_message_idx").on(t.messageId),
    memberIdx: index("signal_marks_member_idx").on(t.memberId),
  }),
);

export const signalAftercare = pgTable(
  "signal_aftercare",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => signalRequests.id, { onDelete: "cascade" }),
    ownerMemberId: uuid("owner_member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    nextContactAt: timestamp("next_contact_at", { withTimezone: true }),
    resourcesShared: jsonb("resources_shared").$type<string[]>().notNull().default([]),
    wantsFollowUp: boolean("wants_follow_up").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    requestUnique: uniqueIndex("signal_aftercare_request_unique").on(t.requestId),
    ownerIdx: index("signal_aftercare_owner_idx").on(t.ownerMemberId),
  }),
);
