// NURA — schema.ts
// Guardian layer for the public commons ("The Chapel"). Extends the
// members / member_roles tier spine. NEVER references Signal (private DM)
// tables — Nura has no data-layer surface into Signal, by design.

import {
  pgEnum,
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

// The two postures. One brain, two contexts.
export const siteEnum = pgEnum("nura_site", ["antisocial", "misfit"]);

export const memberRoleEnum = pgEnum("member_role_name", [
  "member",
  "admin",
  "responder",
]);

// ---------------------------------------------------------------------------
// The tier spine (members / member_roles) — pre-existing ecosystem tables,
// modeled here so Nura's schema is self-contained in this project.
// ---------------------------------------------------------------------------

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  tier: text("tier").notNull().default("street"), // e.g. street -> crib -> ...
  banned: boolean("banned").notNull().default(false), // soft, reversible
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberRoles = pgTable(
  "member_roles",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull(),
    // null site = global role (e.g. platform admin)
    site: siteEnum("site"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    memberRoleIdx: index("member_roles_member_idx").on(t.memberId),
  }),
);

// ---------------------------------------------------------------------------
// The Chapel — the public commons. Antisocial's public chat + Misfit
// Ministries' public spaces. This is the ONLY surface Nura ingests from.
// Misfit Signal (private DMs) has no table here and Nura must never gain one.
// ---------------------------------------------------------------------------

export const chapelMessages = pgTable(
  "chapel_messages",
  {
    id: serial("id").primaryKey(),
    site: siteEnum("site").notNull(),
    memberId: integer("member_id").references(() => members.id, {
      onDelete: "set null",
    }), // null = system / Nura message (e.g. pastoral_reply)
    threadId: integer("thread_id"), // self-referential root message id
    body: text("body").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    hidden: boolean("hidden").notNull().default(false), // soft-hide, reversible
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    siteIdx: index("chapel_messages_site_idx").on(t.site, t.createdAt),
    threadIdx: index("chapel_messages_thread_idx").on(t.threadId),
  }),
);

// ---------------------------------------------------------------------------
// Responder ledger — reused by Nura's crisis path. This is the same ledger
// the Signal/Pit responder-dispatch work already owns; Nura only appends.
// ---------------------------------------------------------------------------

export const alertLedgerEntries = pgTable("alert_ledger_entries", {
  id: serial("id").primaryKey(),
  site: siteEnum("site").notNull(),
  memberId: integer("member_id").references(() => members.id, {
    onDelete: "set null",
  }),
  messageId: integer("message_id").references(() => chapelMessages.id, {
    onDelete: "set null",
  }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"), // open | answered | closed
  answeredBy: integer("answered_by").references(() => members.id, {
    onDelete: "set null",
  }),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// nura_config — per-site thresholds, tolerances, reminder copy, packs, and
// the class -> action map. Editable without redeploy.
// ---------------------------------------------------------------------------

export const nuraConfig = pgTable(
  "nura_config",
  {
    id: serial("id").primaryKey(),
    site: siteEnum("site").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    siteKeyIdx: uniqueIndex("nura_config_site_key_idx").on(t.site, t.key),
  }),
);

// ---------------------------------------------------------------------------
// nura_log — APPEND ONLY. Every flag and every action, forever. No update or
// delete path exists in the service layer; enforced additionally by a DB
// trigger (see migration) that rejects UPDATE/DELETE on this table.
// ---------------------------------------------------------------------------

export const nuraLog = pgTable(
  "nura_log",
  {
    id: serial("id").primaryKey(),
    site: siteEnum("site").notNull(),
    messageId: integer("message_id").references(() => chapelMessages.id, {
      onDelete: "set null",
    }),
    memberId: integer("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    stage: text("stage").notNull(), // tier1 | tier2 | tier3
    flag: text("flag").notNull(), // none | harm_candidate | confirmed_harm | crisis | predation
    llmClass: text("llm_class"), // playful | tension | genuine_harm | crisis | unclear
    action: text("action").notNull(), // none | pastoral_reply | nudge_public | remove_post | remove_user | alert_responder
    decidedBy: text("decided_by").notNull(), // code | llm | human
    reason: text("reason").notNull(),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    siteFlagIdx: index("nura_log_site_flag_idx").on(t.site, t.flag),
    createdIdx: index("nura_log_created_idx").on(t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// nura_actions — reversible record of consequences. remove_post / remove_user
// write here. Admin reverses by flipping active=false. Nothing is destroyed.
// ---------------------------------------------------------------------------

export const nuraActions = pgTable(
  "nura_actions",
  {
    id: serial("id").primaryKey(),
    site: siteEnum("site").notNull(),
    targetType: text("target_type").notNull(), // post | user
    targetId: integer("target_id").notNull(),
    action: text("action").notNull(), // remove_post | remove_user
    active: boolean("active").notNull().default(true),
    reversedBy: integer("reversed_by").references(() => members.id, {
      onDelete: "set null",
    }),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    siteActiveIdx: index("nura_actions_site_active_idx").on(t.site, t.active),
  }),
);

// ---------------------------------------------------------------------------
// nura_reminders — the no-names public nudges, triggered by ambient rate.
// ---------------------------------------------------------------------------

export const nuraReminders = pgTable("nura_reminders", {
  id: serial("id").primaryKey(),
  site: siteEnum("site").notNull(),
  body: text("body").notNull(),
  triggeredBy: text("triggered_by").notNull(), // ambient reason
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
