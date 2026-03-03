import { callOpenRouterModel, extractJSON } from '../llm-utils';
import type { AdaptiveState } from '@shared/types';

const SIGNAL_MODEL = 'meta-llama/llama-3.1-8b-instruct';

interface MidDebateSignals {
  evidenceUse: number;
  responsiveness: number;
  clarity: number;
}

/**
 * Get mid-debate signal scores using a cheap model.
 * Runs after each student response to track performance trend.
 */
export async function getMidDebateSignals(
  studentMessage: string,
  opponentChallenge: string,
): Promise<MidDebateSignals> {
  try {
    const raw = await callOpenRouterModel(
      SIGNAL_MODEL,
      `Score this debate response on three dimensions (0.0 to 1.0):
- evidenceUse: Does the student cite specific evidence to support their claims?
- responsiveness: Does the student directly address the opponent's specific challenge?
- clarity: Is the argument well-structured and easy to follow?

Return JSON: {"evidenceUse": 0.7, "responsiveness": 0.8, "clarity": 0.6}`,
      `Opponent's challenge: "${opponentChallenge}"
Student's response: "${studentMessage}"`,
      100,
      0.0,
    );

    const signals = extractJSON(raw) as MidDebateSignals;
    return {
      evidenceUse: Math.max(0, Math.min(1, signals.evidenceUse || 0)),
      responsiveness: Math.max(0, Math.min(1, signals.responsiveness || 0)),
      clarity: Math.max(0, Math.min(1, signals.clarity || 0)),
    };
  } catch (err: any) {
    console.error('[Adaptive] Signal detection failed:', err.message);
    return { evidenceUse: 0.5, responsiveness: 0.5, clarity: 0.5 };
  }
}

/**
 * Compute adaptive state update after round 5.
 * If the student is scoring >0.7 average, upgrade from curious_skeptic to domain_expert.
 */
export function computeAdaptiveStateUpdate(
  currentState: AdaptiveState,
  newSignals: MidDebateSignals,
  round: number,
): AdaptiveState {
  // Running average of signals
  const alpha = 0.3; // Exponential moving average weight
  const updatedState: AdaptiveState = {
    ...currentState,
    evidenceUse: currentState.evidenceUse * (1 - alpha) + newSignals.evidenceUse * alpha,
    responsiveness: currentState.responsiveness * (1 - alpha) + newSignals.responsiveness * alpha,
    clarity: currentState.clarity * (1 - alpha) + newSignals.clarity * alpha,
  };

  // Only consider upgrade after round 5, and only once
  if (round >= 5 && !currentState.upgradeTriggered && currentState.currentDifficulty === 'curious_skeptic') {
    const avgScore = (updatedState.evidenceUse + updatedState.responsiveness + updatedState.clarity) / 3;

    if (avgScore > 0.7) {
      updatedState.currentDifficulty = 'domain_expert';
      updatedState.upgradeTriggered = true;
      updatedState.upgradeRound = round;
      console.log(`[Adaptive] Upgrading to domain_expert at round ${round} (avg: ${avgScore.toFixed(2)})`);
    }
  }

  return updatedState;
}
