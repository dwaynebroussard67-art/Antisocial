import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  primaryKey,
  uniqueIndex,
  index,
  date,
} from "drizzle-orm/pg-core";
import { members } from "./members";

// PORTED from docs/salvaged/original-upload-reference.txt (Arcade section).
// Rename applied throughout, same convention as Workshop/Mission Board:
// blockMembers -> members. Everything else (table names, indexes, the
// FOR UPDATE SKIP LOCKED matchmaking pattern) is unchanged from the salvage.
//
// This is Arcade sub-piece 1 of 6 (see HANDOFF-17 §4.3, "recommend breaking
// it into sub-pieces"). This file lays down the FULL core schema — every
// future arcade game (War, Chess, Mystery, Shooter, RPG) hangs off
// arcadeGames/arcadeRatings/arcadeMatches/arcadeMatchmakingQueue — but only
// Trivia + generic solo-score games are wired up with real routes this pass.
// head_to_head and multiplayer game kinds are declared here so the enum
// doesn't need a migration later, but nothing populates arcadeMatches yet.

export const arcadeGameKindEnum = pgEnum("arcade_game_kind", [
  "solo_score",
  "head_to_head",
  "multiplayer",
]);
export const arcadeScoreDirectionEnum = pgEnum("arcade_score_direction", ["higher_better", "lower_better"]);
export const arcadeMatchStatusEnum = pgEnum("arcade_match_status", ["pending", "active", "completed"]);

// The registry every other arcade table's gameKey points at. Adding a new
// game means adding one row here — nothing else needs to know about it.
export const arcadeGames = pgTable("arcade_games", {
  key: text("key").primaryKey(), // e.g. "trivia", "war"
  name: text("name").notNull(),
  kind: arcadeGameKindEnum("kind").notNull(),
  scoreDirection: arcadeScoreDirectionEnum("score_direction").notNull().default("higher_better"),
  active: text("active").notNull().default("true"),
});

export const arcadeRatings = pgTable(
  "arcade_ratings",
  {
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    gameKey: text("game_key").notNull().references(() => arcadeGames.key),
    rating: integer("rating").notNull().default(1200),
    gamesPlayed: integer("games_played").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.memberId, t.gameKey] }),
    leaderboardIdx: index("arcade_ratings_leaderboard_idx").on(t.gameKey, t.rating),
  })
);

// Best-score-per-attempt log for solo_score games. Leaderboards read this,
// not a mutable "best score" column, so history is never silently overwritten.
export const arcadeScores = pgTable(
  "arcade_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    gameKey: text("game_key").notNull().references(() => arcadeGames.key),
    score: integer("score").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    leaderboardIdx: index("arcade_scores_leaderboard_idx").on(t.gameKey, t.score),
  })
);

// Declared now for future head_to_head/multiplayer sub-pieces (War, Chess) —
// not populated by anything in this pass.
export const arcadeMatches = pgTable("arcade_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameKey: text("game_key").notNull().references(() => arcadeGames.key),
  playerAId: uuid("player_a_id").notNull().references(() => members.id),
  playerBId: uuid("player_b_id").notNull().references(() => members.id),
  status: arcadeMatchStatusEnum("status").notNull().default("active"),
  winnerId: uuid("winner_id").references(() => members.id), // null = draw or in progress
  state: jsonb("state").notNull(), // game-specific engine state, opaque to this table on purpose
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// Real queue-consumption pattern: FOR UPDATE SKIP LOCKED, not a naive SELECT.
// Two members joining the queue in the same instant must never both grab
// the same waiting opponent. Unused until a head_to_head game ships, kept
// here so the schema is stable across the whole Arcade porting effort.
export const arcadeMatchmakingQueue = pgTable(
  "arcade_matchmaking_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    gameKey: text("game_key").notNull().references(() => arcadeGames.key),
    division: text("division").notNull(),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    queueIdx: index("arcade_queue_idx").on(t.gameKey, t.division, t.queuedAt),
    onePerMemberPerGame: uniqueIndex("arcade_queue_member_game_uq").on(t.memberId, t.gameKey),
  })
);

// Site-wide, not per-game — deliberately, matching the salvage's design note:
// one streak tracks daily arcade engagement across every game, not per-game.
export const arcadeDailyStreaks = pgTable("arcade_daily_streaks", {
  memberId: uuid("member_id").primaryKey().references(() => members.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalActiveDays: integer("total_active_days").notNull().default(0),
  lastActiveDate: date("last_active_date"),
});
