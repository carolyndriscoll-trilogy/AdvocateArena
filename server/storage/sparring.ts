import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { sparringPeerProfiles } from '@shared/schema';

export async function createSparringPeerProfile(data: {
  courseId: number;
  sourceUserId: string;
  argumentationPattern: {
    rhetoricalMoves: string[];
    typicalEvasions: string[];
    favoredEvidence: string[];
  };
  strengthAxes: string[];
  weaknessAxes: string[];
  optInLevel?: string;
}) {
  const [profile] = await db.insert(sparringPeerProfiles).values(data).returning();
  return profile;
}

export async function getSparringPeerProfile(courseId: number, userId: string) {
  return db.query.sparringPeerProfiles.findFirst({
    where: and(
      eq(sparringPeerProfiles.courseId, courseId),
      eq(sparringPeerProfiles.sourceUserId, userId),
    ),
  });
}

export async function getSparringPeersByCourse(courseId: number) {
  return db.select().from(sparringPeerProfiles)
    .where(eq(sparringPeerProfiles.courseId, courseId))
    .orderBy(desc(sparringPeerProfiles.updatedAt));
}

export async function updateSparringPeerProfile(id: number, data: Partial<{
  argumentationPattern: {
    rhetoricalMoves: string[];
    typicalEvasions: string[];
    favoredEvidence: string[];
  };
  strengthAxes: string[];
  weaknessAxes: string[];
  optInLevel: string;
}>) {
  const [updated] = await db.update(sparringPeerProfiles)
    .set(data)
    .where(eq(sparringPeerProfiles.id, id))
    .returning();
  return updated;
}
