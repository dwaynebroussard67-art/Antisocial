import { pgTable, uuid, text, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";
import { members } from "./members";

/**
 * THE PIT ALERT LEDGER
 * You were clear: this does NOT read live from the Nura/Narcan Watch alert
 * system. It's a separate, staff-maintained record. That's a deliberate
 * privacy boundary as much as a technical one — the live alert system
 * erases location data the moment it's used; this ledger only ever holds
 * the aggregate, anonymized outcome, entered by a human after the fact.
 *
 * NEVER add a lat/lng, address, or any field that could re-identify a
 * specific overdose location or the person who experienced it. This table
 * is a count and a record of care, not a case file.
 */

export const alertOutcomeEnum = pgEnum("alert_outcome", [
  "pending",       // alert went out, outcome not yet known/logged
  "life_saved",
  "life_lost",
  "unable_to_locate",
  "false_alarm",
]);

export const alertAnsweredEnum = pgEnum("alert_answered", [
  "unanswered",       // no responder affirmed within range
  "answered",         // at least one responder affirmed
]);

export const alertLedgerEntries = pgTable("alert_ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Coarse only — enough for the board to show "this month" without ever
  // being precise enough to reconstruct a specific incident's timing.
  incidentDate: timestamp("incident_date", { withTimezone: true }).notNull(),

  answered: alertAnsweredEnum("answered").notNull().default("unanswered"),
  outcome: alertOutcomeEnum("outcome").notNull().default("pending"),

  // Optional coarse locality for pattern-of-need visibility — a neighborhood
  // or zip prefix, NEVER an address. Left nullable; staff decide per entry
  // whether it's safe/appropriate to include at all.
  approxArea: text("approx_area"),

  respondersNotifiedCount: integer("responders_notified_count"),
  respondersAffirmedCount: integer("responders_affirmed_count"),

  notes: text("notes"), // staff-written, no PII — enforced by policy/review, not code

  loggedBy: uuid("logged_by").notNull().references(() => members.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
