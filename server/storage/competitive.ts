import { db } from '../db';
import { eq } from 'drizzle-orm';
import { competitiveStacks } from '@shared/schema';

export async function createCompetitiveStack(data: {
  defenseId: number;
  alternativeFramework: {
    thesis: string;
    evidence: string[];
    divergencePoints: string[];
  };
  rivalPersonaConfig: {
    name: string;
    specialty: string;
    argumentStyle: string;
  };
}) {
  const [stack] = await db.insert(competitiveStacks).values(data).returning();
  return stack;
}

export async function getCompetitiveStackByDefenseId(defenseId: number) {
  return db.query.competitiveStacks.findFirst({
    where: eq(competitiveStacks.defenseId, defenseId),
  });
}
