import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import {
  adversaryDefenses,
  defenseSubmissions,
  defenseConfigs,
  defenseLevelAttempts,
  defenseReflections,
  coachingPrescriptions,
  courses,
  courseEnrollments,
} from '@shared/schema';

// ─── Defenses ───────────────────────────────────────────────────────────────

export async function createDefense(data: {
  userId: string;
  courseId?: number;
  mode: string;
  title: string;
}) {
  const [defense] = await db.insert(adversaryDefenses).values(data).returning();
  return defense;
}

export async function getDefenseById(id: number) {
  return db.query.adversaryDefenses.findFirst({
    where: eq(adversaryDefenses.id, id),
    with: {
      submission: true,
      config: true,
      levelAttempts: true,
      reflection: true,
    },
  });
}

export async function getDefensesByUserId(userId: string) {
  return db.query.adversaryDefenses.findMany({
    where: eq(adversaryDefenses.userId, userId),
    orderBy: desc(adversaryDefenses.createdAt),
    with: {
      submission: true,
    },
  });
}

export async function getDefensesByCourseId(courseId: number) {
  return db.query.adversaryDefenses.findMany({
    where: eq(adversaryDefenses.courseId, courseId),
    orderBy: desc(adversaryDefenses.createdAt),
    with: {
      submission: true,
      user: true,
    },
  });
}

export async function updateDefenseStatus(id: number, status: string) {
  const [updated] = await db.update(adversaryDefenses)
    .set({ status })
    .where(eq(adversaryDefenses.id, id))
    .returning();
  return updated;
}

export async function updateDefenseTotalScore(id: number, totalScore: number) {
  const [updated] = await db.update(adversaryDefenses)
    .set({ totalScore })
    .where(eq(adversaryDefenses.id, id))
    .returning();
  return updated;
}

// ─── Submissions ────────────────────────────────────────────────────────────

export async function createSubmission(data: {
  defenseId: number;
  pov: string;
  evidence: Array<{ claim: string; source: string; sourceUrl?: string }>;
  counterEvidence?: Array<{ claim: string; source: string; sourceUrl?: string }>;
  sourceDocuments?: Array<{ title: string; url?: string; excerpt?: string }>;
}) {
  const [submission] = await db.insert(defenseSubmissions).values(data).returning();
  return submission;
}

export async function getSubmissionByDefenseId(defenseId: number) {
  return db.query.defenseSubmissions.findFirst({
    where: eq(defenseSubmissions.defenseId, defenseId),
  });
}

export async function updateSubmissionReview(
  defenseId: number,
  reviewStatus: string,
  reviewNotes: string | null,
  reviewedBy: string
) {
  const [updated] = await db.update(defenseSubmissions)
    .set({ reviewStatus, reviewNotes, reviewedBy })
    .where(eq(defenseSubmissions.defenseId, defenseId))
    .returning();
  return updated;
}

export async function updateAutoReviewResult(defenseId: number, result: {
  pass: boolean;
  feedback: string[];
  suggestedRevisions: string[];
}) {
  const [updated] = await db.update(defenseSubmissions)
    .set({ autoReviewResult: result })
    .where(eq(defenseSubmissions.defenseId, defenseId))
    .returning();
  return updated;
}

export async function updateRevisedPov(defenseId: number, revisedPov: string) {
  const [updated] = await db.update(defenseSubmissions)
    .set({ revisedPov })
    .where(eq(defenseSubmissions.defenseId, defenseId))
    .returning();
  return updated;
}

// ─── Configs ────────────────────────────────────────────────────────────────

export async function createConfig(data: {
  defenseId: number;
  inferredField?: string;
  counterArguments?: string[];
  pivotTopics?: string[];
  opponentPersona?: string;
  difficultyLevel?: string;
}) {
  const [config] = await db.insert(defenseConfigs).values(data).returning();
  return config;
}

export async function getConfigByDefenseId(defenseId: number) {
  return db.query.defenseConfigs.findFirst({
    where: eq(defenseConfigs.defenseId, defenseId),
  });
}

export async function updateConfig(defenseId: number, data: Partial<{
  inferredField: string;
  counterArguments: string[];
  pivotTopics: string[];
  opponentPersona: string;
  difficultyLevel: string;
  guideInjections: Array<{ round: number; directive: string }>;
  extractedSourceText: string;
}>) {
  const [updated] = await db.update(defenseConfigs)
    .set(data)
    .where(eq(defenseConfigs.defenseId, defenseId))
    .returning();
  return updated;
}

// ─── Level Attempts ─────────────────────────────────────────────────────────

export async function createLevelAttempt(defenseId: number, attemptNumber: number = 1) {
  const [attempt] = await db.insert(defenseLevelAttempts)
    .values({ defenseId, attemptNumber })
    .returning();
  return attempt;
}

export async function getActiveLevelAttempt(defenseId: number) {
  return db.query.defenseLevelAttempts.findFirst({
    where: and(
      eq(defenseLevelAttempts.defenseId, defenseId),
      eq(defenseLevelAttempts.status, 'in_progress'),
    ),
  });
}

export async function getLevelAttemptById(id: number) {
  return db.query.defenseLevelAttempts.findFirst({
    where: eq(defenseLevelAttempts.id, id),
  });
}

export async function updateLevelAttempt(id: number, data: Partial<{
  conversationHistory: any;
  currentRound: number;
  adaptiveState: any;
  evaluationOutput: any;
  scoreBreakdown: any;
  finalScore: number;
  evaluatorDisagreement: boolean;
  penaltyLog: any;
  fillerPenalties: any;
  status: string;
}>) {
  const [updated] = await db.update(defenseLevelAttempts)
    .set(data)
    .where(eq(defenseLevelAttempts.id, id))
    .returning();
  return updated;
}

// ─── Reflections ────────────────────────────────────────────────────────────

export async function createReflection(data: {
  defenseId: number;
  reflection: string;
  aiCoachingResponse?: string;
}) {
  const [reflection] = await db.insert(defenseReflections).values(data).returning();
  return reflection;
}

export async function getReflectionByDefenseId(defenseId: number) {
  return db.query.defenseReflections.findFirst({
    where: eq(defenseReflections.defenseId, defenseId),
  });
}

// ─── Coaching ───────────────────────────────────────────────────────────────

export async function createCoachingPrescription(data: {
  userId: string;
  defenseId: number;
  axis: string;
  prescription: string;
}) {
  const [prescription] = await db.insert(coachingPrescriptions).values(data).returning();
  return prescription;
}

export async function getCoachingByDefenseId(defenseId: number) {
  return db.select().from(coachingPrescriptions)
    .where(eq(coachingPrescriptions.defenseId, defenseId));
}

export async function getCoachingByUserId(userId: string) {
  return db.select().from(coachingPrescriptions)
    .where(eq(coachingPrescriptions.userId, userId))
    .orderBy(desc(coachingPrescriptions.createdAt));
}

export async function updateCoachingStatus(id: number, status: string) {
  const [updated] = await db.update(coachingPrescriptions)
    .set({ status })
    .where(eq(coachingPrescriptions.id, id))
    .returning();
  return updated;
}

// ─── Courses ────────────────────────────────────────────────────────────────

export async function createCourse(data: {
  name: string;
  code: string;
  guideId: string;
}) {
  const [course] = await db.insert(courses).values(data).returning();
  return course;
}

export async function getCourseById(id: number) {
  return db.query.courses.findFirst({
    where: eq(courses.id, id),
  });
}

export async function getCoursesByGuideId(guideId: string) {
  return db.select().from(courses)
    .where(eq(courses.guideId, guideId))
    .orderBy(desc(courses.createdAt));
}

export async function enrollStudent(courseId: number, userId: string) {
  const [enrollment] = await db.insert(courseEnrollments)
    .values({ courseId, userId })
    .returning();
  return enrollment;
}

export async function getCourseEnrollments(courseId: number) {
  return db.query.courseEnrollments.findMany({
    where: eq(courseEnrollments.courseId, courseId),
    with: { user: true },
  });
}
