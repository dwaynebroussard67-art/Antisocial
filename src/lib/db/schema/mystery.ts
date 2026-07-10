import { pgTable, uuid, text, integer, timestamp, jsonb, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";
import { members } from "./members";

// PORTED from salvage. Only rename applied: blockMembers -> members.

export const mysteryLobbyStatusEnum = pgEnum("mystery_lobby_status", ["waiting", "active", "completed"]);

export const mysteryLobbies = pgTable(
  "mystery_lobbies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: mysteryLobbyStatusEnum("status").notNull().default("waiting"),
    createdBy: uuid("created_by").notNull().references(() => members.id),
    minPlayers: integer("min_players").notNull().default(3),
    maxPlayers: integer("max_players").notNull().default(6),
    // Full server-authoritative state (solution, all hands, log) once active.
    // NEVER sent to a client unredacted — see lib/arcade/mystery/redact.ts.
    state: jsonb("state"),
    winnerId: uuid("winner_id").references(() => members.id), // null = unsolved OR still in progress
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({ statusIdx: index("mystery_lobbies_status_idx").on(t.status) })
);

export const mysteryLobbyPlayers = pgTable(
  "mystery_lobby_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lobbyId: uuid("lobby_id").notNull().references(() => mysteryLobbies.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    seatOrder: integer("seat_order"), // assigned at start(); null while waiting
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ oneRowPerMember: uniqueIndex("mystery_lobby_players_uq").on(t.lobbyId, t.memberId) })
);

// Deliberately its OWN table, not a field inside the jsonb state blob. A
// private reveal is the single most sensitive piece of data in this entire
// feature — separating it structurally means the redaction function has
// nothing to accidentally leak, because it never even queries this table
// for anyone except the entitled suggester.
export const mysteryPrivateReveals = pgTable(
  "mystery_private_reveals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lobbyId: uuid("lobby_id").notNull().references(() => mysteryLobbies.id, { onDelete: "cascade" }),
    suggestionIndex: integer("suggestion_index").notNull(),
    suggesterId: uuid("suggester_id").notNull().references(() => members.id),
    disproverId: uuid("disprover_id").notNull().references(() => members.id),
    cardId: text("card_id").notNull(),
    revealedAt: timestamp("revealed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ suggesterIdx: index("mystery_reveals_suggester_idx").on(t.lobbyId, t.suggesterId) })
);
