-- Signal messaging spine (HANDOFF-28). Idempotent: apply-schema.mjs runs
-- every drizzle/*.sql in order and these guards make re-runs safe.
CREATE TABLE IF NOT EXISTS "signal_rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "type" text NOT NULL,
  "trust_floor" text NOT NULL DEFAULT 'street',
  "is_private" boolean NOT NULL DEFAULT true,
  "witness_default" boolean NOT NULL DEFAULT false,
  "created_by_member_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "signal_room_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "member_id" uuid NOT NULL,
  "role" text NOT NULL DEFAULT 'member',
  "joined_at" timestamp with time zone NOT NULL DEFAULT now(),
  "can_post" boolean NOT NULL DEFAULT true,
  "can_reply" boolean NOT NULL DEFAULT true,
  "muted" boolean NOT NULL DEFAULT false,
  "boundary_only" boolean NOT NULL DEFAULT false,
  "last_read_message_id" uuid
);
CREATE TABLE IF NOT EXISTS "signal_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "sender_member_id" uuid NOT NULL,
  "parent_message_id" uuid,
  "kind" text NOT NULL DEFAULT 'text',
  "body" text,
  "voice_url" text,
  "transcript" text,
  "visibility" text NOT NULL DEFAULT 'keep',
  "witness_mode" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS "signal_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "from_member_id" uuid NOT NULL,
  "to_member_id" uuid NOT NULL,
  "room_id" uuid,
  "type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "prompt" text,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "resolved_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "signal_marks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL,
  "member_id" uuid NOT NULL,
  "mark" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "signal_aftercare" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" uuid NOT NULL,
  "owner_member_id" uuid NOT NULL,
  "next_contact_at" timestamp with time zone,
  "resources_shared" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "wants_follow_up" boolean NOT NULL DEFAULT true,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
DO $$ BEGIN ALTER TABLE "signal_rooms" ADD CONSTRAINT "signal_rooms_created_by_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "members"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_room_members" ADD CONSTRAINT "signal_room_members_room_fk" FOREIGN KEY ("room_id") REFERENCES "signal_rooms"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_room_members" ADD CONSTRAINT "signal_room_members_member_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_messages" ADD CONSTRAINT "signal_messages_room_fk" FOREIGN KEY ("room_id") REFERENCES "signal_rooms"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_messages" ADD CONSTRAINT "signal_messages_sender_fk" FOREIGN KEY ("sender_member_id") REFERENCES "members"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_messages" ADD CONSTRAINT "signal_messages_parent_fk" FOREIGN KEY ("parent_message_id") REFERENCES "signal_messages"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_requests" ADD CONSTRAINT "signal_requests_from_fk" FOREIGN KEY ("from_member_id") REFERENCES "members"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_requests" ADD CONSTRAINT "signal_requests_to_fk" FOREIGN KEY ("to_member_id") REFERENCES "members"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_requests" ADD CONSTRAINT "signal_requests_room_fk" FOREIGN KEY ("room_id") REFERENCES "signal_rooms"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_marks" ADD CONSTRAINT "signal_marks_message_fk" FOREIGN KEY ("message_id") REFERENCES "signal_messages"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_marks" ADD CONSTRAINT "signal_marks_member_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_aftercare" ADD CONSTRAINT "signal_aftercare_request_fk" FOREIGN KEY ("request_id") REFERENCES "signal_requests"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "signal_aftercare" ADD CONSTRAINT "signal_aftercare_owner_fk" FOREIGN KEY ("owner_member_id") REFERENCES "members"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "signal_rooms_slug_unique" ON "signal_rooms" ("slug");
CREATE INDEX IF NOT EXISTS "signal_rooms_type_idx" ON "signal_rooms" ("type");
CREATE INDEX IF NOT EXISTS "signal_rooms_trust_idx" ON "signal_rooms" ("trust_floor");
CREATE UNIQUE INDEX IF NOT EXISTS "signal_room_members_unique" ON "signal_room_members" ("room_id","member_id");
CREATE INDEX IF NOT EXISTS "signal_room_members_room_idx" ON "signal_room_members" ("room_id");
CREATE INDEX IF NOT EXISTS "signal_room_members_member_idx" ON "signal_room_members" ("member_id");
CREATE INDEX IF NOT EXISTS "signal_messages_room_idx" ON "signal_messages" ("room_id");
CREATE INDEX IF NOT EXISTS "signal_messages_sender_idx" ON "signal_messages" ("sender_member_id");
CREATE INDEX IF NOT EXISTS "signal_messages_parent_idx" ON "signal_messages" ("parent_message_id");
CREATE INDEX IF NOT EXISTS "signal_messages_created_idx" ON "signal_messages" ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "signal_requests_unique" ON "signal_requests" ("from_member_id","to_member_id","type");
CREATE INDEX IF NOT EXISTS "signal_requests_from_idx" ON "signal_requests" ("from_member_id");
CREATE INDEX IF NOT EXISTS "signal_requests_to_idx" ON "signal_requests" ("to_member_id");
CREATE INDEX IF NOT EXISTS "signal_requests_status_idx" ON "signal_requests" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "signal_marks_unique" ON "signal_marks" ("message_id","member_id","mark");
CREATE INDEX IF NOT EXISTS "signal_marks_message_idx" ON "signal_marks" ("message_id");
CREATE INDEX IF NOT EXISTS "signal_marks_member_idx" ON "signal_marks" ("member_id");
CREATE UNIQUE INDEX IF NOT EXISTS "signal_aftercare_request_unique" ON "signal_aftercare" ("request_id");
CREATE INDEX IF NOT EXISTS "signal_aftercare_owner_idx" ON "signal_aftercare" ("owner_member_id");
