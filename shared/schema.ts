import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  uniqueIndex,
  index,
  real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Auth Tables (BetterAuth managed) ───────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'), // user | guide | admin
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id),
  impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Domain Tables ──────────────────────────────────────────────────────────

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  guideId: text('guide_id').notNull().references(() => user.id),
  isActive: boolean('is_active').notNull().default(true),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const courseEnrollments = pgTable('course_enrollments', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id),
  userId: text('user_id').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('course_enrollments_unique').on(table.courseId, table.userId),
]);

export const adversaryDefenses = pgTable('adversary_defenses', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  courseId: integer('course_id').references(() => courses.id),
  mode: text('mode').notNull().default('assessed'), // assessed | sparring
  status: text('status').notNull().default('draft'), // draft→submitted→under_review→approved→active→complete|failed
  title: text('title').notNull(),
  isRetake: boolean('is_retake').notNull().default(false),
  originalDefenseId: integer('original_defense_id'),
  totalScore: integer('total_score'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('defenses_user_idx').on(table.userId),
  index('defenses_course_idx').on(table.courseId),
  index('defenses_status_idx').on(table.status),
]);

export const defenseSubmissions = pgTable('defense_submissions', {
  id: serial('id').primaryKey(),
  defenseId: integer('defense_id').notNull().references(() => adversaryDefenses.id).unique(),
  pov: text('pov').notNull(),
  evidence: jsonb('evidence').$type<Array<{ claim: string; source: string; sourceUrl?: string }>>().notNull().default([]),
  counterEvidence: jsonb('counter_evidence').$type<Array<{ claim: string; source: string; sourceUrl?: string }>>().default([]),
  sourceDocuments: jsonb('source_documents').$type<Array<{ title: string; url?: string; excerpt?: string }>>().default([]),
  reviewStatus: text('review_status').notNull().default('pending'), // pending | approved | rejected | revision_requested
  reviewNotes: text('review_notes'),
  reviewedBy: text('reviewed_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const defenseConfigs = pgTable('defense_configs', {
  id: serial('id').primaryKey(),
  defenseId: integer('defense_id').notNull().references(() => adversaryDefenses.id).unique(),
  inferredField: text('inferred_field'),
  counterArguments: jsonb('counter_arguments').$type<string[]>().default([]),
  pivotTopics: jsonb('pivot_topics').$type<string[]>().default([]),
  opponentPersona: text('opponent_persona').default('philosopher'), // philosopher | empiricist | contrarian | strategist
  difficultyLevel: text('difficulty_level').default('curious_skeptic'), // curious_skeptic | domain_expert
  guideInjections: jsonb('guide_injections').$type<Array<{ round: number; directive: string }>>().default([]),
  extractedSourceText: text('extracted_source_text'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const defenseLevelAttempts = pgTable('defense_level_attempts', {
  id: serial('id').primaryKey(),
  defenseId: integer('defense_id').notNull().references(() => adversaryDefenses.id),
  attemptNumber: integer('attempt_number').notNull().default(1),
  conversationHistory: jsonb('conversation_history').$type<Array<{
    role: 'user' | 'assistant';
    content: string;
    round: number;
    timestamp: string;
    wordCount?: number;
    stallingFlags?: string[];
  }>>().notNull().default([]),
  currentRound: integer('current_round').notNull().default(0),
  adaptiveState: jsonb('adaptive_state').$type<{
    currentDifficulty: string;
    evidenceUse: number;
    responsiveness: number;
    clarity: number;
    upgradeTriggered: boolean;
    upgradeRound?: number;
  }>().default({
    currentDifficulty: 'curious_skeptic',
    evidenceUse: 0,
    responsiveness: 0,
    clarity: 0,
    upgradeTriggered: false,
  }),
  evaluationOutput: jsonb('evaluation_output').$type<{
    scores: Array<{
      axis: string;
      criteria: Array<{ name: string; met: boolean; evidence: string }>;
      score: number;
      maxScore: number;
    }>;
    totalScore: number;
    maxScore: number;
    penalties: Array<{ reason: string; deduction: number }>;
    strongestMoments: string[];
    improvementAreas: string[];
  }>(),
  scoreBreakdown: jsonb('score_breakdown').$type<Record<string, number>>(),
  finalScore: integer('final_score'),
  evaluatorDisagreement: boolean('evaluator_disagreement').default(false),
  penaltyLog: jsonb('penalty_log').$type<Array<{ round: number; type: string; details: string }>>().default([]),
  status: text('status').notNull().default('in_progress'), // in_progress | evaluating | passed | failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('level_attempts_defense_idx').on(table.defenseId),
]);

export const defenseReflections = pgTable('defense_reflections', {
  id: serial('id').primaryKey(),
  defenseId: integer('defense_id').notNull().references(() => adversaryDefenses.id).unique(),
  reflection: text('reflection').notNull(),
  aiCoachingResponse: text('ai_coaching_response'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const coachingPrescriptions = pgTable('coaching_prescriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  defenseId: integer('defense_id').notNull().references(() => adversaryDefenses.id),
  axis: text('axis').notNull(),
  prescription: text('prescription').notNull(),
  status: text('status').notNull().default('active'), // active | addressed | dismissed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('coaching_user_idx').on(table.userId),
  index('coaching_defense_idx').on(table.defenseId),
]);

export const competitiveStacks = pgTable('competitive_stacks', {
  id: serial('id').primaryKey(),
  defenseId: integer('defense_id').notNull().references(() => adversaryDefenses.id).unique(),
  alternativeFramework: jsonb('alternative_framework').$type<{
    thesis: string;
    evidence: string[];
    divergencePoints: string[];
  }>(),
  rivalPersonaConfig: jsonb('rival_persona_config').$type<{
    name: string;
    specialty: string;
    argumentStyle: string;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sparringPeerProfiles = pgTable('sparring_peer_profiles', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id),
  sourceUserId: text('source_user_id').notNull().references(() => user.id),
  argumentationPattern: jsonb('argumentation_pattern').$type<{
    rhetoricalMoves: string[];
    typicalEvasions: string[];
    favoredEvidence: string[];
  }>(),
  strengthAxes: jsonb('strength_axes').$type<string[]>().default([]),
  weaknessAxes: jsonb('weakness_axes').$type<string[]>().default([]),
  optInLevel: text('opt_in_level').notNull().default('closed'), // closed | class_visible | open
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const gauntletEvents = pgTable('gauntlet_events', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id),
  name: text('name').notNull(),
  config: jsonb('config').$type<{
    roundsPerAttacker: number;
    maxAttackers: number;
    allowHumanAttackers: boolean;
  }>().default({ roundsPerAttacker: 5, maxAttackers: 3, allowHumanAttackers: false }),
  status: text('status').notNull().default('upcoming'), // upcoming | active | completed
  scheduledAt: timestamp('scheduled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const gauntletParticipants = pgTable('gauntlet_participants', {
  id: serial('id').primaryKey(),
  gauntletId: integer('gauntlet_id').notNull().references(() => gauntletEvents.id),
  userId: text('user_id').notNull().references(() => user.id),
  role: text('role').notNull().default('defender'), // defender | attacker | observer
  score: integer('score'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('gauntlet_participant_unique').on(table.gauntletId, table.userId),
]);

export const normingExemplars = pgTable('norming_exemplars', {
  id: serial('id').primaryKey(),
  axis: text('axis').notNull(),
  performanceLevel: text('performance_level').notNull(), // exemplary | proficient | developing | beginning
  transcriptExcerpt: text('transcript_excerpt').notNull(),
  annotatorNotes: text('annotator_notes'),
  score: integer('score').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Relations ──────────────────────────────────────────────────────────────

export const adversaryDefensesRelations = relations(adversaryDefenses, ({ one, many }) => ({
  user: one(user, { fields: [adversaryDefenses.userId], references: [user.id] }),
  course: one(courses, { fields: [adversaryDefenses.courseId], references: [courses.id] }),
  submission: one(defenseSubmissions, { fields: [adversaryDefenses.id], references: [defenseSubmissions.defenseId] }),
  config: one(defenseConfigs, { fields: [adversaryDefenses.id], references: [defenseConfigs.defenseId] }),
  levelAttempts: many(defenseLevelAttempts),
  reflection: one(defenseReflections, { fields: [adversaryDefenses.id], references: [defenseReflections.defenseId] }),
  coachingPrescriptions: many(coachingPrescriptions),
  competitiveStack: one(competitiveStacks, { fields: [adversaryDefenses.id], references: [competitiveStacks.defenseId] }),
}));

export const defenseLevelAttemptsRelations = relations(defenseLevelAttempts, ({ one }) => ({
  defense: one(adversaryDefenses, { fields: [defenseLevelAttempts.defenseId], references: [adversaryDefenses.id] }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  guide: one(user, { fields: [courses.guideId], references: [user.id] }),
  enrollments: many(courseEnrollments),
  defenses: many(adversaryDefenses),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
  user: one(user, { fields: [courseEnrollments.userId], references: [user.id] }),
}));
