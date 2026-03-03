import type { JobHelpers } from 'graphile-worker';
import { storage } from '../storage';
import { generateCompetitiveStack } from '../ai/arena/competitiveStackGenerator';

export async function arenaCompetitiveStackJob(
  payload: { defenseId: number },
  helpers: JobHelpers,
) {
  const { defenseId } = payload;
  helpers.logger.info('Generating competitive stack', { defenseId });

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new Error(`Defense ${defenseId} not found`);

  const submission = defense.submission;
  if (!submission) throw new Error(`No submission for defense ${defenseId}`);

  const result = await generateCompetitiveStack(
    submission.pov,
    submission.evidence as Array<{ claim: string; source: string }>,
  );

  await storage.createCompetitiveStack({
    defenseId,
    alternativeFramework: result.framework,
    rivalPersonaConfig: result.rivalPersona,
  });

  helpers.logger.info('Competitive stack generated', {
    defenseId,
    rivalName: result.rivalPersona.name,
  });
}
