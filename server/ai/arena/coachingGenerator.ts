import { callOpenRouterModel, extractJSON } from '../llm-utils';
import type { EvaluationOutput, ScoringAxis } from '@shared/types';

const COACHING_MODEL = 'anthropic/claude-sonnet-4-5';

interface CoachingOutput {
  strongestMoments: Array<{ round: number; description: string; quote: string }>;
  improvements: Array<{
    axis: ScoringAxis;
    weakness: string;
    rewrite: string;
    originalRound: number;
  }>;
  patternAnalysis: string;
  preparationPlan: string;
  revisedPovSuggestion: string;
}

export async function generateCoaching(
  conversationHistory: Array<{ role: string; content: string; round: number }>,
  studentPov: string,
  evaluationOutput: EvaluationOutput,
): Promise<CoachingOutput> {
  const transcript = conversationHistory
    .map(m => `[Round ${m.round}] ${m.role === 'user' ? 'STUDENT' : 'OPPONENT'}: ${m.content}`)
    .join('\n\n');

  const scoresSummary = evaluationOutput.scores
    .map(s => `${s.axis}: ${s.score}/${s.maxScore}`)
    .join(', ');

  const weakAxes = evaluationOutput.scores
    .filter(s => s.score < s.maxScore * 0.75)
    .map(s => s.axis);

  const raw = await callOpenRouterModel(
    COACHING_MODEL,
    `You are an expert debate coach analyzing a student's performance in an adversarial debate.

The student defended this position: "${studentPov}"

Their scores: ${scoresSummary} (Total: ${evaluationOutput.totalScore}/${evaluationOutput.maxScore})
Weak areas: ${weakAxes.join(', ') || 'none identified'}

## Your Task
Analyze the transcript and generate specific, actionable coaching.

Return JSON:
{
  "strongestMoments": [
    {"round": 3, "description": "Strong counter-engagement when...", "quote": "exact quote from student"}
  ],
  "improvements": [
    {
      "axis": "counter_engagement",
      "weakness": "In round 7, the student deflected instead of engaging...",
      "rewrite": "Here's how they could have responded: 'While the empirical data...'",
      "originalRound": 7
    }
  ],
  "patternAnalysis": "Across the debate, the student tends to...",
  "preparationPlan": "Before the next debate, the student should...",
  "revisedPovSuggestion": "A stronger version of the student's position would be..."
}

IMPORTANT:
- Identify 2-3 strongest moments with specific quotes
- For each weak axis, provide a concrete rewrite showing what a better response looks like
- Pattern analysis should identify recurring tendencies (good and bad)
- Preparation plan should be specific and actionable (not generic advice)
- Revised POV should strengthen the defensibility of the student's position`,
    `## Debate Transcript\n${transcript}`,
    3000,
    0.3,
  );

  return extractJSON(raw) as CoachingOutput;
}

/**
 * Extract per-axis coaching prescriptions for persistent tracking.
 */
export function extractPrescriptions(
  coaching: CoachingOutput,
): Array<{ axis: string; prescription: string }> {
  return coaching.improvements.map(imp => ({
    axis: imp.axis,
    prescription: `${imp.weakness}\n\nSuggested approach: ${imp.rewrite}`,
  }));
}
