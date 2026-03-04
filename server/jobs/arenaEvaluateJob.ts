import type { JobHelpers } from 'graphile-worker';
import { storage } from '../storage';
import { evaluateDebate } from '../ai/arena/evaluator';
import { generateCoaching, extractPrescriptions } from '../ai/arena/coachingGenerator';
import { updateEloAfterDebate } from '../services/elo';
import { storeObservation } from '../utils/honcho';
import { withJob } from '../utils/withJob';

export async function arenaEvaluateJob(
  payload: { defenseId: number; attemptId: number },
  helpers: JobHelpers
) {
  const { defenseId, attemptId } = payload;
  helpers.logger.info('Starting evaluation', { defenseId, attemptId });

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new Error(`Defense ${defenseId} not found`);

  const attempt = await storage.getLevelAttemptById(attemptId);
  if (!attempt) throw new Error(`Attempt ${attemptId} not found`);

  const submission = defense.submission;
  if (!submission) throw new Error(`No submission for defense ${defenseId}`);

  // Mark as evaluating
  await storage.updateLevelAttempt(attemptId, { status: 'evaluating' });

  // Gather penalties from the debate
  const penalties = (attempt.penaltyLog as any[] || []).map((p: any) => ({
    reason: `${p.type} in round ${p.round}: ${p.details}`,
    deduction: p.type === 'stalling' ? 1 : 0,
  })).filter(p => p.deduction > 0);

  // Run dual evaluation
  const { evaluation, disagreement, primaryScores, secondaryScores } = await evaluateDebate(
    attempt.conversationHistory as any[],
    submission.pov,
    submission.evidence as any[],
    penalties,
  );

  helpers.logger.info('Evaluation complete', {
    totalScore: evaluation.totalScore,
    disagreement,
  });

  // Generate coaching
  let coaching;
  try {
    coaching = await generateCoaching(
      attempt.conversationHistory as any[],
      submission.pov,
      evaluation,
    );
  } catch (err: any) {
    helpers.logger.error('Coaching generation failed', { error: err.message });
    coaching = null;
  }

  // Store evaluation results
  await storage.updateLevelAttempt(attemptId, {
    evaluationOutput: evaluation,
    finalScore: evaluation.totalScore,
    evaluatorDisagreement: disagreement,
    status: evaluation.totalScore >= 12 ? 'passed' : 'failed',
  });

  // Update defense
  const newStatus = evaluation.totalScore >= 12 ? 'complete' : 'failed';
  await storage.updateDefenseStatus(defenseId, newStatus);
  await storage.updateDefenseTotalScore(defenseId, evaluation.totalScore);

  // Store coaching prescriptions
  if (coaching) {
    const prescriptions = extractPrescriptions(coaching);
    for (const p of prescriptions) {
      await storage.createCoachingPrescription({
        userId: defense.userId,
        defenseId,
        axis: p.axis,
        prescription: p.prescription,
      });
    }
  }

  // Update Elo rating
  try {
    const config = defense.config;
    const difficulty = (config?.difficultyLevel as string) || 'curious_skeptic';
    const passed = evaluation.totalScore >= 12;
    const eloResult = await updateEloAfterDebate(
      defense.userId,
      difficulty,
      evaluation.totalScore,
      evaluation.maxScore,
      defenseId,
      passed,
    );
    helpers.logger.info('Elo updated', eloResult);
  } catch (err: any) {
    helpers.logger.error('Elo update failed', { error: err.message });
  }

  // Fire-and-forget: store Honcho observation
  storeObservation(
    defense.userId,
    'arena-evaluation',
    `Debate evaluation: ${evaluation.totalScore}/${evaluation.maxScore}. ${newStatus}. ` +
    `Strongest: ${evaluation.strongestMoments?.join('; ')}. ` +
    `Improve: ${evaluation.improvementAreas?.join('; ')}`,
    {
      defenseId,
      score: evaluation.totalScore,
      maxScore: evaluation.maxScore,
      axisScores: Object.fromEntries(evaluation.scores.map(s => [s.axis, s.score])),
    }
  );

  // Queue competitive stack generation for completed defenses
  if (newStatus === 'complete') {
    await withJob('arena:competitive-stack')
      .forPayload({ defenseId })
      .queue();
  }

  helpers.logger.info('Evaluation job complete', { defenseId, score: evaluation.totalScore, status: newStatus });
}
