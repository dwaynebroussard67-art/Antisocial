import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

/**
 * THE AGE GATE (migration 0003).
 *
 * Tri-state on purpose. 'unknown' and 'minor' both deny access, but they
 * are different facts — "we never asked" versus "we know they're 14" — and
 * collapsing them into one boolean loses the second one permanently.
 *
 * unknown is treated as minor everywhere. Never infer age from anything.
 */
export const ageStatusEnum = pgEnum("age_status", ["unknown", "minor", "adult"]);

/**
 * NOTE ON WHY THIS FILE EXISTS:
 * The salvaged codebase imports `blockMembers` from "./block-members" in
 * roughly a dozen files, but that file was never included in what you gave
 * me. Everything else (roles, badges, posts, workshop, mission board) hangs
 * off this table, so I rebuilt it first. Rename the file/import path if your
 * original used a different one — the shape is what matters.
 */

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Nullable on purpose: Street tier is reachable WITHOUT an email.
  // A person can exist as a member row (anonymous session, tied to a
  // device/cookie id) before ever handing over contact info.
  email: text("email").unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),

  // Supabase auth user id (auth.users.id) — the link between a Misfit
  // Ministries login and this member row. Nullable because anonymous
  // Street members exist before (or without) ever signing in.
  authUserId: text("auth_user_id").unique(),

  displayName: text("display_name"),

  // Anonymous street-tier visitors still need a stable identity to hang
  // presence/game-history off of. This is set the first time anyone hits
  // the Antisocial gate, before any sign-in decision is made.
  anonymousDeviceId: text("anonymous_device_id").unique(),

  // Signals the auto-tier-assignment logic reads. Kept flat and simple
  // rather than computed on the fly, so tier assignment stays fast and
  // auditable — every promotion can point at the field that caused it.
  totalDonationsCents: integer("total_donations_cents").notNull().default(0),
  hasPurchased: boolean("has_purchased").notNull().default(false),
  signInCount: integer("sign_in_count").notNull().default(0),
  isMinistryStaff: boolean("is_ministry_staff").notNull().default(false),

  // Set by an admin/minister — this is the "gave up their time" path into
  // the Crib for non-staff. Deliberately not automatic; a human vouches.
  programParticipationVerifiedAt: timestamp("program_participation_verified_at", { withTimezone: true }),
  programParticipationVerifiedBy: uuid("program_participation_verified_by"),

  // Adult verification. Added alongside the game-variant age gate.
  // NULL means "not verified as an adult," which every gate treats exactly
  // as it treats a minor. The gate FAILS CLOSED: an age-restricted build
  // (the Crib's Trap Man — cops, cash, getaway) is withheld unless this is
  // set. Without this column `arcade_game_variants.min_age` would be a
  // number nothing could check — a gate that only looks like one.
  // HOW adulthood gets verified is not decided here; a human sets it, the
  // same pattern as program participation above.
  // DEPRECATED as of migration 0003 — superseded by ageStatus below, which
  // is authoritative. Retained so an in-flight deploy doesn't break; its
  // data was carried forward into ageStatus by the migration. Read through
  // isVerifiedAdult() in lib/auth/age.ts, never this column directly.
  adultVerifiedAt: timestamp("adult_verified_at", { withTimezone: true }),
  adultVerifiedBy: uuid("adult_verified_by"),

  // The age gate. Defaults to 'unknown', which denies exactly as 'minor'
  // does — so the gate holds from the moment it ships, with zero
  // verification infrastructure in place. A verification method can be
  // chosen later without touching this schema.
  ageStatus: ageStatusEnum("age_status").notNull().default("unknown"),
  ageVerifiedAt: timestamp("age_verified_at", { withTimezone: true }),
  // Free text, not a uuid: the verifier may be a staff member, a guardian,
  // a document review, or a migration. The method isn't settled yet and
  // the column shouldn't presume it.
  ageVerifiedBy: text("age_verified_by"),
  ageMethod: text("age_method"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
