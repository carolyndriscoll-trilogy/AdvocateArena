import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { gauntletEvents, gauntletParticipants } from '@shared/schema';

// ─── Events ────────────────────────────────────────────────────────────────

export async function createGauntletEvent(data: {
  courseId: number;
  name: string;
  config?: {
    roundsPerAttacker: number;
    maxAttackers: number;
    allowHumanAttackers: boolean;
  };
  scheduledAt?: Date;
}) {
  const [event] = await db.insert(gauntletEvents).values(data).returning();
  return event;
}

export async function getGauntletEventById(id: number) {
  return db.query.gauntletEvents.findFirst({
    where: eq(gauntletEvents.id, id),
  });
}

export async function getGauntletEventsByCourse(courseId: number) {
  return db.select().from(gauntletEvents)
    .where(eq(gauntletEvents.courseId, courseId))
    .orderBy(desc(gauntletEvents.createdAt));
}

export async function updateGauntletEventStatus(id: number, status: string) {
  const [updated] = await db.update(gauntletEvents)
    .set({ status })
    .where(eq(gauntletEvents.id, id))
    .returning();
  return updated;
}

// ─── Participants ──────────────────────────────────────────────────────────

export async function addGauntletParticipant(data: {
  gauntletId: number;
  userId: string;
  role: string;
}) {
  const [participant] = await db.insert(gauntletParticipants).values(data).returning();
  return participant;
}

export async function getGauntletParticipants(gauntletId: number) {
  return db.select().from(gauntletParticipants)
    .where(eq(gauntletParticipants.gauntletId, gauntletId));
}

export async function updateGauntletParticipantScore(id: number, score: number) {
  const [updated] = await db.update(gauntletParticipants)
    .set({ score })
    .where(eq(gauntletParticipants.id, id))
    .returning();
  return updated;
}

export async function getGauntletParticipant(gauntletId: number, userId: string) {
  return db.query.gauntletParticipants.findFirst({
    where: and(
      eq(gauntletParticipants.gauntletId, gauntletId),
      eq(gauntletParticipants.userId, userId),
    ),
  });
}
