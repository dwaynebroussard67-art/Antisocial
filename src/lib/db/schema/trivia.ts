import { pgTable, uuid, text, integer, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { members } from "./members";

// PORTED from salvage. Rename applied: blockMembers -> members.

export const triviaQuestions = pgTable("trivia_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  question: text("question").notNull(),
  choices: text("choices").array().notNull(), // exactly 4, validated at insert time in application code
  correctIndex: integer("correct_index").notNull(), // 0-3
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per calendar day — deterministic daily question, same for everyone.
export const triviaDailyRotation = pgTable("trivia_daily_rotation", {
  date: date("date").primaryKey(),
  questionId: uuid("question_id").notNull().references(() => triviaQuestions.id),
});

export const triviaAttempts = pgTable(
  "trivia_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    correct: text("correct").notNull(), // "true"/"false" — matches the salvage's simple on/off convention
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    onePerDay: uniqueIndex("trivia_attempts_member_date_uq").on(t.memberId, t.date),
  })
);
