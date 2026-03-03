import type { JobHelpers } from 'graphile-worker';
import { storage } from '../storage';
import { generateDefenseConfig } from '../ai/arena/configGenerator';

export async function arenaGenerateConfigJob(
  payload: { defenseId: number },
  helpers: JobHelpers
) {
  const { defenseId } = payload;
  helpers.logger.info('Generating defense config', { defenseId });

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new Error(`Defense ${defenseId} not found`);

  const submission = defense.submission;
  if (!submission) throw new Error(`No submission for defense ${defenseId}`);

  const config = await generateDefenseConfig(
    submission.pov,
    submission.evidence as any[],
  );

  // Create or update config
  const existing = await storage.getConfigByDefenseId(defenseId);
  if (existing) {
    await storage.updateConfig(defenseId, {
      inferredField: config.inferredField,
      counterArguments: config.counterArguments,
      pivotTopics: config.pivotTopics,
      opponentPersona: config.recommendedPersona,
      difficultyLevel: config.recommendedDifficulty,
    });
  } else {
    await storage.createConfig({
      defenseId,
      inferredField: config.inferredField,
      counterArguments: config.counterArguments,
      pivotTopics: config.pivotTopics,
      opponentPersona: config.recommendedPersona,
      difficultyLevel: config.recommendedDifficulty,
    });
  }

  helpers.logger.info('Config generation complete', {
    defenseId,
    field: config.inferredField,
    persona: config.recommendedPersona,
  });
}
