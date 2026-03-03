import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { normingExemplars } from '@shared/schema';

export async function createNormingExemplar(data: {
  axis: string;
  performanceLevel: string;
  transcriptExcerpt: string;
  annotatorNotes?: string;
  score: number;
}) {
  const [exemplar] = await db.insert(normingExemplars).values(data).returning();
  return exemplar;
}

export async function getNormingExemplars(filters?: {
  axis?: string;
  performanceLevel?: string;
}) {
  if (filters?.axis && filters?.performanceLevel) {
    return db.select().from(normingExemplars)
      .where(and(
        eq(normingExemplars.axis, filters.axis),
        eq(normingExemplars.performanceLevel, filters.performanceLevel),
      ))
      .orderBy(desc(normingExemplars.createdAt));
  }
  if (filters?.axis) {
    return db.select().from(normingExemplars)
      .where(eq(normingExemplars.axis, filters.axis))
      .orderBy(desc(normingExemplars.createdAt));
  }
  if (filters?.performanceLevel) {
    return db.select().from(normingExemplars)
      .where(eq(normingExemplars.performanceLevel, filters.performanceLevel))
      .orderBy(desc(normingExemplars.createdAt));
  }
  return db.select().from(normingExemplars)
    .orderBy(desc(normingExemplars.createdAt));
}

export async function getNormingExemplarById(id: number) {
  return db.query.normingExemplars.findFirst({
    where: eq(normingExemplars.id, id),
  });
}

export async function deleteNormingExemplar(id: number) {
  await db.delete(normingExemplars).where(eq(normingExemplars.id, id));
}
