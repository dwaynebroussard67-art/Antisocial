-- D's corrections, this session:
--   C1  tier ladder (one-level-up presence peek, downward-only interaction)
--   C2  the Street gets games — game variants registry
--   C3  Nura's moderation authority — quarantine, bands, auto-ban, audit
--
-- Idempotent throughout: apply-schema.mjs runs every drizzle/*.sql in order
-- and re-runs must be safe. Every statement is guarded.

-- ===========================================================================
-- C1 — ladder
-- ===========================================================================
-- No new tables. The peek reads member_roles + member_presence, which both
-- already exist. The one behavioural change (presence heartbeat lowered from
-- Block to Street) is application-side only.

-- ===========================================================================
-- C2 — game variants
-- ===========================================================================
CREATE TABLE IF NOT EXISTS "arcade_game_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_key" text NOT NULL REFERENCES "arcade_games"("key") ON DELETE CASCADE,
  "tier" "member_tier" NOT NULL,
  "variant_key" text NOT NULL,
  "title" text NOT NULL,
  "asset_bundle" text,
  "blurb" text,
  -- Inactive by default: a registry row existing must never mean a game is
  -- live. Activation is a data change, not a deploy.
  "active" boolean NOT NULL DEFAULT false,
  "min_age" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "arcade_game_variants_game_tier_uq"
  ON "arcade_game_variants" ("game_key", "tier");
CREATE INDEX IF NOT EXISTS "arcade_game_variants_tier_idx"
  ON "arcade_game_variants" ("tier", "active");

-- Adult verification, required for min_age to mean anything. NULL = not a
-- verified adult, which every gate treats exactly as it treats a minor.
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "adult_verified_at" timestamp with time zone;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "adult_verified_by" uuid;

-- ===========================================================================
-- C3 — Nura moderation
-- ===========================================================================
DO $$ BEGIN
  CREATE TYPE "nura_verdict" AS ENUM ('clear', 'band_b_uncertain', 'band_a_violation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "quarantine_status" AS ENUM ('quarantined', 'released', 'upheld');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "nura_action_kind" AS ENUM (
    'quarantine', 'auto_remove', 'auto_ban', 'staff_alert',
    'human_release', 'human_uphold', 'ban_reversed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 'quarantined' is a new member of an existing enum. IF NOT EXISTS makes the
-- re-run safe; this cannot run inside a transaction block on PG < 12, which
-- apply-schema.mjs already accounts for by executing statements individually.
ALTER TYPE "block_post_status" ADD VALUE IF NOT EXISTS 'quarantined';

CREATE TABLE IF NOT EXISTS "content_quarantine" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "content_type" text NOT NULL,
  "content_id" uuid NOT NULL,
  "author_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  -- A COPY of what was said. Band A deletes the source, and a review with
  -- nothing to read is not a review.
  "captured_body" text NOT NULL,
  "verdict" "nura_verdict" NOT NULL,
  "score" integer NOT NULL,
  "categories" text[] NOT NULL DEFAULT '{}'::text[],
  "rationale" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" "quarantine_status" NOT NULL DEFAULT 'quarantined',
  "reviewed_by" uuid REFERENCES "members"("id"),
  "reviewed_at" timestamp with time zone,
  "review_notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "content_quarantine_queue_idx"
  ON "content_quarantine" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "content_quarantine_content_idx"
  ON "content_quarantine" ("content_type", "content_id");
CREATE INDEX IF NOT EXISTS "content_quarantine_author_idx"
  ON "content_quarantine" ("author_id");

-- Append-only. If Nura is ever wrong, this is where that becomes visible.
CREATE TABLE IF NOT EXISTS "nura_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_kind" "nura_action_kind" NOT NULL,
  "subject_member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "quarantine_id" uuid REFERENCES "content_quarantine"("id") ON DELETE SET NULL,
  "verdict" "nura_verdict",
  "score" integer,
  -- NULL actor = Nura acting on her own authority. The normal case.
  "actor_member_id" uuid REFERENCES "members"("id"),
  "detail" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "nura_actions_subject_idx"
  ON "nura_actions" ("subject_member_id", "created_at");
CREATE INDEX IF NOT EXISTS "nura_actions_kind_idx"
  ON "nura_actions" ("action_kind", "created_at");

CREATE TABLE IF NOT EXISTS "member_bans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  -- NULL = Nura. She needed nobody's permission and the record says so.
  "banned_by" uuid REFERENCES "members"("id"),
  "reason" text NOT NULL,
  "verdict" "nura_verdict",
  "quarantine_id" uuid REFERENCES "content_quarantine"("id") ON DELETE SET NULL,
  "banned_at" timestamp with time zone NOT NULL DEFAULT now(),
  -- Staff-only, never automatic, never promised to the banned person.
  "reversed_at" timestamp with time zone,
  "reversed_by" uuid REFERENCES "members"("id"),
  "reversal_notes" text
);

CREATE INDEX IF NOT EXISTS "member_bans_member_idx"
  ON "member_bans" ("member_id", "reversed_at");

-- Replies had no status column — visible or soft-deleted, nothing between.
-- Nura needs a third state that is neither.
ALTER TABLE "block_post_replies"
  ADD COLUMN IF NOT EXISTS "status" "block_post_status" NOT NULL DEFAULT 'published';

-- Signal's hold flag. Timestamp rather than boolean so the record shows WHEN.
ALTER TABLE "signal_messages"
  ADD COLUMN IF NOT EXISTS "quarantined_at" timestamp with time zone;
