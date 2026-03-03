CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adversary_defenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" integer,
	"mode" text DEFAULT 'assessed' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"is_retake" boolean DEFAULT false NOT NULL,
	"original_defense_id" integer,
	"total_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaching_prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"defense_id" integer NOT NULL,
	"axis" text NOT NULL,
	"prescription" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitive_stacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"defense_id" integer NOT NULL,
	"alternative_framework" jsonb,
	"rival_persona_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competitive_stacks_defense_id_unique" UNIQUE("defense_id")
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"guide_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "defense_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"defense_id" integer NOT NULL,
	"inferred_field" text,
	"counter_arguments" jsonb DEFAULT '[]'::jsonb,
	"pivot_topics" jsonb DEFAULT '[]'::jsonb,
	"opponent_persona" text DEFAULT 'philosopher',
	"difficulty_level" text DEFAULT 'curious_skeptic',
	"guide_injections" jsonb DEFAULT '[]'::jsonb,
	"extracted_source_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "defense_configs_defense_id_unique" UNIQUE("defense_id")
);
--> statement-breakpoint
CREATE TABLE "defense_level_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"defense_id" integer NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"conversation_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"adaptive_state" jsonb DEFAULT '{"currentDifficulty":"curious_skeptic","evidenceUse":0,"responsiveness":0,"clarity":0,"upgradeTriggered":false}'::jsonb,
	"evaluation_output" jsonb,
	"score_breakdown" jsonb,
	"final_score" integer,
	"evaluator_disagreement" boolean DEFAULT false,
	"penalty_log" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "defense_reflections" (
	"id" serial PRIMARY KEY NOT NULL,
	"defense_id" integer NOT NULL,
	"reflection" text NOT NULL,
	"ai_coaching_response" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "defense_reflections_defense_id_unique" UNIQUE("defense_id")
);
--> statement-breakpoint
CREATE TABLE "defense_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"defense_id" integer NOT NULL,
	"pov" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"counter_evidence" jsonb DEFAULT '[]'::jsonb,
	"source_documents" jsonb DEFAULT '[]'::jsonb,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "defense_submissions_defense_id_unique" UNIQUE("defense_id")
);
--> statement-breakpoint
CREATE TABLE "gauntlet_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{"roundsPerAttacker":5,"maxAttackers":3,"allowHumanAttackers":false}'::jsonb,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gauntlet_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"gauntlet_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'defender' NOT NULL,
	"score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "norming_exemplars" (
	"id" serial PRIMARY KEY NOT NULL,
	"axis" text NOT NULL,
	"performance_level" text NOT NULL,
	"transcript_excerpt" text NOT NULL,
	"annotator_notes" text,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sparring_peer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"source_user_id" text NOT NULL,
	"argumentation_pattern" jsonb,
	"strength_axes" jsonb DEFAULT '[]'::jsonb,
	"weakness_axes" jsonb DEFAULT '[]'::jsonb,
	"opt_in_level" text DEFAULT 'closed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adversary_defenses" ADD CONSTRAINT "adversary_defenses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adversary_defenses" ADD CONSTRAINT "adversary_defenses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_prescriptions" ADD CONSTRAINT "coaching_prescriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_prescriptions" ADD CONSTRAINT "coaching_prescriptions_defense_id_adversary_defenses_id_fk" FOREIGN KEY ("defense_id") REFERENCES "public"."adversary_defenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitive_stacks" ADD CONSTRAINT "competitive_stacks_defense_id_adversary_defenses_id_fk" FOREIGN KEY ("defense_id") REFERENCES "public"."adversary_defenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_guide_id_user_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defense_configs" ADD CONSTRAINT "defense_configs_defense_id_adversary_defenses_id_fk" FOREIGN KEY ("defense_id") REFERENCES "public"."adversary_defenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defense_level_attempts" ADD CONSTRAINT "defense_level_attempts_defense_id_adversary_defenses_id_fk" FOREIGN KEY ("defense_id") REFERENCES "public"."adversary_defenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defense_reflections" ADD CONSTRAINT "defense_reflections_defense_id_adversary_defenses_id_fk" FOREIGN KEY ("defense_id") REFERENCES "public"."adversary_defenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defense_submissions" ADD CONSTRAINT "defense_submissions_defense_id_adversary_defenses_id_fk" FOREIGN KEY ("defense_id") REFERENCES "public"."adversary_defenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gauntlet_events" ADD CONSTRAINT "gauntlet_events_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gauntlet_participants" ADD CONSTRAINT "gauntlet_participants_gauntlet_id_gauntlet_events_id_fk" FOREIGN KEY ("gauntlet_id") REFERENCES "public"."gauntlet_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gauntlet_participants" ADD CONSTRAINT "gauntlet_participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sparring_peer_profiles" ADD CONSTRAINT "sparring_peer_profiles_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sparring_peer_profiles" ADD CONSTRAINT "sparring_peer_profiles_source_user_id_user_id_fk" FOREIGN KEY ("source_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "defenses_user_idx" ON "adversary_defenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "defenses_course_idx" ON "adversary_defenses" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "defenses_status_idx" ON "adversary_defenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coaching_user_idx" ON "coaching_prescriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coaching_defense_idx" ON "coaching_prescriptions" USING btree ("defense_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_enrollments_unique" ON "course_enrollments" USING btree ("course_id","user_id");--> statement-breakpoint
CREATE INDEX "level_attempts_defense_idx" ON "defense_level_attempts" USING btree ("defense_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gauntlet_participant_unique" ON "gauntlet_participants" USING btree ("gauntlet_id","user_id");