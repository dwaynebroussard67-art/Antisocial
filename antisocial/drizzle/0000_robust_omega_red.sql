DO $$ BEGIN
 CREATE TYPE "public"."alert_answered" AS ENUM('unanswered', 'answered');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."alert_outcome" AS ENUM('pending', 'life_saved', 'life_lost', 'unable_to_locate', 'false_alarm');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."arcade_game_kind" AS ENUM('solo_score', 'head_to_head', 'multiplayer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."arcade_match_status" AS ENUM('pending', 'active', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."arcade_score_direction" AS ENUM('higher_better', 'lower_better');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."block_post_status" AS ENUM('published', 'flagged', 'removed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."member_tier" AS ENUM('street', 'block', 'crib', 'pit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."site_role" AS ENUM('member', 'moderator', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mission_need_category" AS ENUM('service', 'skills', 'logistics', 'administrative', 'creative', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mission_need_status" AS ENUM('open', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mission_signup_status" AS ENUM('active', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."moderation_flag_status" AS ENUM('pending', 'reviewing', 'actioned', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('reply', 'mention', 'badge_awarded', 'quest_ready', 'mission_signup_filled', 'workshop_update', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."workshop_project_status" AS ENUM('planning', 'active', 'completed', 'paused');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."workshop_volunteer_status" AS ENUM('active', 'left');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_date" timestamp with time zone NOT NULL,
	"answered" "alert_answered" DEFAULT 'unanswered' NOT NULL,
	"outcome" "alert_outcome" DEFAULT 'pending' NOT NULL,
	"approx_area" text,
	"responders_notified_count" integer,
	"responders_affirmed_count" integer,
	"notes" text,
	"logged_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arcade_daily_streaks" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_active_days" integer DEFAULT 0 NOT NULL,
	"last_active_date" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arcade_games" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" "arcade_game_kind" NOT NULL,
	"score_direction" "arcade_score_direction" DEFAULT 'higher_better' NOT NULL,
	"active" text DEFAULT 'true' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arcade_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_key" text NOT NULL,
	"player_a_id" uuid NOT NULL,
	"player_b_id" uuid NOT NULL,
	"status" "arcade_match_status" DEFAULT 'active' NOT NULL,
	"winner_id" uuid,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arcade_matchmaking_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"game_key" text NOT NULL,
	"division" text NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arcade_ratings" (
	"member_id" uuid NOT NULL,
	"game_key" text NOT NULL,
	"rating" integer DEFAULT 1200 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "arcade_ratings_member_id_game_key_pk" PRIMARY KEY("member_id","game_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arcade_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"game_key" text NOT NULL,
	"score" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "block_post_cheers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "block_post_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "block_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"section_key" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "block_post_status" DEFAULT 'published' NOT NULL,
	"cheer_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text,
	"tier_scope" "member_tier",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_event" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"tier" "member_tier" DEFAULT 'street' NOT NULL,
	"site_role" "site_role" DEFAULT 'member' NOT NULL,
	"is_misfit_first_responder" boolean DEFAULT false NOT NULL,
	"responder_activated_at" timestamp with time zone,
	"responder_qr_code" text,
	"crib_granted_at" timestamp with time zone,
	"crib_granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_roles_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"email_verified_at" timestamp with time zone,
	"auth_user_id" text,
	"display_name" text,
	"anonymous_device_id" text,
	"total_donations_cents" integer DEFAULT 0 NOT NULL,
	"has_purchased" boolean DEFAULT false NOT NULL,
	"sign_in_count" integer DEFAULT 0 NOT NULL,
	"is_ministry_staff" boolean DEFAULT false NOT NULL,
	"program_participation_verified_at" timestamp with time zone,
	"program_participation_verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email"),
	CONSTRAINT "members_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "members_anonymous_device_id_unique" UNIQUE("anonymous_device_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mission_board_needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "mission_need_category" NOT NULL,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"location" text,
	"slots_needed" integer NOT NULL,
	"deadline" timestamp with time zone,
	"status" "mission_need_status" DEFAULT 'open' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mission_board_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"need_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" "mission_signup_status" DEFAULT 'active' NOT NULL,
	"signed_up_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" text NOT NULL,
	"content_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"reported_by" uuid,
	"status" "moderation_flag_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_presence" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link_url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trivia_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"date" date NOT NULL,
	"correct" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trivia_daily_rotation" (
	"date" date PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trivia_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"choices" text[] NOT NULL,
	"correct_index" integer NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshop_discussion_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshop_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"mission_statement" text NOT NULL,
	"description" text NOT NULL,
	"status" "workshop_project_status" DEFAULT 'planning' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"cover_photo_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshop_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"photo_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshop_volunteers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role" text,
	"status" "workshop_volunteer_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_ledger_entries" ADD CONSTRAINT "alert_ledger_entries_logged_by_members_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_daily_streaks" ADD CONSTRAINT "arcade_daily_streaks_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_matches" ADD CONSTRAINT "arcade_matches_game_key_arcade_games_key_fk" FOREIGN KEY ("game_key") REFERENCES "public"."arcade_games"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_matches" ADD CONSTRAINT "arcade_matches_player_a_id_members_id_fk" FOREIGN KEY ("player_a_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_matches" ADD CONSTRAINT "arcade_matches_player_b_id_members_id_fk" FOREIGN KEY ("player_b_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_matches" ADD CONSTRAINT "arcade_matches_winner_id_members_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_matchmaking_queue" ADD CONSTRAINT "arcade_matchmaking_queue_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_matchmaking_queue" ADD CONSTRAINT "arcade_matchmaking_queue_game_key_arcade_games_key_fk" FOREIGN KEY ("game_key") REFERENCES "public"."arcade_games"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_ratings" ADD CONSTRAINT "arcade_ratings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_ratings" ADD CONSTRAINT "arcade_ratings_game_key_arcade_games_key_fk" FOREIGN KEY ("game_key") REFERENCES "public"."arcade_games"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_scores" ADD CONSTRAINT "arcade_scores_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "arcade_scores" ADD CONSTRAINT "arcade_scores_game_key_arcade_games_key_fk" FOREIGN KEY ("game_key") REFERENCES "public"."arcade_games"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "block_post_cheers" ADD CONSTRAINT "block_post_cheers_post_id_block_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."block_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "block_post_cheers" ADD CONSTRAINT "block_post_cheers_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "block_post_replies" ADD CONSTRAINT "block_post_replies_post_id_block_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."block_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "block_post_replies" ADD CONSTRAINT "block_post_replies_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "block_posts" ADD CONSTRAINT "block_posts_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_badges" ADD CONSTRAINT "member_badges_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_badges" ADD CONSTRAINT "member_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_events" ADD CONSTRAINT "member_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_crib_granted_by_members_id_fk" FOREIGN KEY ("crib_granted_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_board_needs" ADD CONSTRAINT "mission_board_needs_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_board_signups" ADD CONSTRAINT "mission_board_signups_need_id_mission_board_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."mission_board_needs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_board_signups" ADD CONSTRAINT "mission_board_signups_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_reported_by_members_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_reviewer_id_members_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_presence" ADD CONSTRAINT "member_presence_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trivia_attempts" ADD CONSTRAINT "trivia_attempts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trivia_daily_rotation" ADD CONSTRAINT "trivia_daily_rotation_question_id_trivia_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."trivia_questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_discussion_comments" ADD CONSTRAINT "workshop_discussion_comments_project_id_workshop_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workshop_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_discussion_comments" ADD CONSTRAINT "workshop_discussion_comments_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_projects" ADD CONSTRAINT "workshop_projects_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_updates" ADD CONSTRAINT "workshop_updates_project_id_workshop_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workshop_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_updates" ADD CONSTRAINT "workshop_updates_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_volunteers" ADD CONSTRAINT "workshop_volunteers_project_id_workshop_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workshop_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_volunteers" ADD CONSTRAINT "workshop_volunteers_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arcade_queue_idx" ON "arcade_matchmaking_queue" USING btree ("game_key","division","queued_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "arcade_queue_member_game_uq" ON "arcade_matchmaking_queue" USING btree ("member_id","game_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arcade_ratings_leaderboard_idx" ON "arcade_ratings" USING btree ("game_key","rating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arcade_scores_leaderboard_idx" ON "arcade_scores" USING btree ("game_key","score");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "block_post_cheers_uq" ON "block_post_cheers" USING btree ("post_id","member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "block_post_replies_post_idx" ON "block_post_replies" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "block_posts_feed_idx" ON "block_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "block_posts_section_idx" ON "block_posts" USING btree ("section_key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_badges_member_badge_uq" ON "member_badges" USING btree ("member_id","badge_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_needs_status_idx" ON "mission_board_needs" USING btree ("status","deadline");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_signups_need_member_idx" ON "mission_board_signups" USING btree ("need_id","member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_member_idx" ON "notifications" USING btree ("member_id","read_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trivia_attempts_member_date_uq" ON "trivia_attempts" USING btree ("member_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_comments_project_idx" ON "workshop_discussion_comments" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_projects_status_idx" ON "workshop_projects" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_updates_project_idx" ON "workshop_updates" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workshop_volunteers_project_member_uq" ON "workshop_volunteers" USING btree ("project_id","member_id");