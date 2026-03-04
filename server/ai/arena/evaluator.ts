import { callOpenRouterModel, extractJSON } from '../llm-utils';
import type { EvaluationOutput, ScoreBreakdown, ScoringAxis, SCORING_AXES } from '@shared/types';

const PRIMARY_MODEL = 'anthropic/claude-opus-4';
const SECONDARY_MODEL = 'google/gemini-2.0-flash-001';

const RUBRIC = `# Adversarial Debate Evaluation Rubric

## Scoring: 5 axes, 4 binary criteria each = 20 points max

### 1. Factual Accuracy (4 pts)
- C1: Made verifiable claims with specific details (not vague assertions)
- C2: Attributed claims to specific sources when making evidence-based arguments
- C3: Acknowledged and corrected errors when challenged on factual points
- C4: Used precise numbers, dates, or data points where relevant (numerical precision)

### 2. Depth of Reasoning (4 pts)
- C1: Traced causal chains beyond surface-level explanations (cause → effect → implication)
- C2: Considered multiple perspectives or interpretations of the same evidence
- C3: Addressed broader implications and downstream consequences of their position
- C4: Made novel connections between ideas or evidence that weren't obvious

### 3. Epistemic Honesty (4 pts)
- C1: Explicitly acknowledged the limits of their knowledge or evidence
- C2: Distinguished between what the evidence shows vs. what they infer or believe
- C3: Updated or refined their position in response to strong counterarguments
- C4: Demonstrated intellectual humility (didn't overstate certainty or dismiss valid criticism)

### 4. Composure Under Pressure (4 pts)
- C1: Stayed focused on the substantive issue when challenged aggressively
- C2: Redirected unproductive exchanges back to evidence and reasoning gracefully
- C3: Avoided stalling, filibustering, or filling space without substance
- C4: Maintained analytical rigor in later rounds (didn't deteriorate under fatigue)

### 5. Argument Evolution (4 pts)
- C1: Built on earlier points rather than repeating or abandoning them
- C2: Integrated valid points from the opponent's arguments into their own position
- C3: Progressively refined their position across rounds (not static)
- C4: Maintained a coherent narrative arc from opening to closing arguments`;

const EVALUATION_PROMPT = `${RUBRIC}

## Instructions
Evaluate the following debate transcript. For each criterion, determine MET or NOT MET and quote specific evidence from the transcript.

Return JSON in this exact format (axis names must be: factual_accuracy, depth_of_reasoning, epistemic_honesty, composure_under_pressure, argument_evolution):
{
  "scores": [
    {
      "axis": "factual_accuracy",
      "criteria": [
        {"name": "Made verifiable claims with specific details", "met": true, "evidence": "In round 3, student cited..."},
        {"name": "Attributed claims to specific sources", "met": true, "evidence": "..."},
        {"name": "Acknowledged and corrected errors", "met": false, "evidence": "Student never addressed..."},
        {"name": "Used precise numbers or data points", "met": false, "evidence": "Claims lacked specificity..."}
      ],
      "score": 2,
      "maxScore": 4
    }
  ],
  "totalScore": 14,
  "maxScore": 20,
  "strongestMoments": ["In round 5, the student effectively...", "Round 8 showed strong..."],
  "improvementAreas": ["The student consistently avoided...", "Evidence quality could improve by..."]
}

IMPORTANT:
- Score each criterion independently. Each is worth exactly 1 point (met) or 0 (not met).
- The axis score is the sum of met criteria for that axis.
- Cite specific rounds and quotes as evidence for each judgment.
- Be rigorous but fair. Partial engagement counts as NOT MET — the criterion must be clearly satisfied.
- totalScore must equal the sum of all 5 axis scores.`;

function formatTranscript(
  history: Array<{ role: string; content: string; round: number }>,
  studentPov: string,
  evidence: Array<{ claim: string; source: string }>,
): string {
  const evidenceStr = evidence.map((e, i) => `${i + 1}. "${e.claim}" (${e.source})`).join('\n');

  const transcript = history
    .map(m => `[Round ${m.round}] ${m.role === 'user' ? 'STUDENT' : 'OPPONENT'}: ${m.content}`)
    .join('\n\n');

  return `## Student's Position
"${studentPov}"

## Student's Submitted Evidence
${evidenceStr}

## Debate Transcript
${transcript}`;
}

async function runEvaluator(
  model: string,
  transcript: string,
): Promise<EvaluationOutput> {
  const raw = await callOpenRouterModel(
    model,
    EVALUATION_PROMPT,
    transcript,
    4000,
    0.0,
  );

  return extractJSON(raw) as EvaluationOutput;
}

/**
 * Run dual evaluation with disagreement detection.
 * Two evaluators score independently; if they disagree by >1 point on any axis,
 * flag for human resolution.
 */
export async function evaluateDebate(
  conversationHistory: Array<{ role: string; content: string; round: number }>,
  studentPov: string,
  evidence: Array<{ claim: string; source: string }>,
  penalties: Array<{ reason: string; deduction: number }>,
): Promise<{
  evaluation: EvaluationOutput;
  disagreement: boolean;
  primaryScores: EvaluationOutput;
  secondaryScores: EvaluationOutput;
}> {
  const transcript = formatTranscript(conversationHistory, studentPov, evidence);

  // Run both evaluators in parallel
  const [primary, secondary] = await Promise.all([
    runEvaluator(PRIMARY_MODEL, transcript),
    runEvaluator(SECONDARY_MODEL, transcript),
  ]);

  // Check for disagreement (>1 point spread on any axis)
  let disagreement = false;
  for (let i = 0; i < primary.scores.length; i++) {
    const pScore = primary.scores[i]?.score ?? 0;
    const sScore = secondary.scores[i]?.score ?? 0;
    if (Math.abs(pScore - sScore) > 1) {
      disagreement = true;
      break;
    }
  }

  // If no disagreement, use consensus (average, rounded down)
  let evaluation: EvaluationOutput;
  if (!disagreement) {
    evaluation = {
      scores: primary.scores.map((pAxis, i) => {
        const sAxis = secondary.scores[i];
        const consensusScore = Math.floor((pAxis.score + (sAxis?.score ?? pAxis.score)) / 2);
        return {
          ...pAxis,
          score: consensusScore,
        };
      }),
      totalScore: 0,
      maxScore: 20,
      penalties: [],
      strongestMoments: [...(primary.strongestMoments || []), ...(secondary.strongestMoments || [])].slice(0, 3),
      improvementAreas: [...(primary.improvementAreas || []), ...(secondary.improvementAreas || [])].slice(0, 3),
    };

    // Recalculate total
    evaluation.totalScore = evaluation.scores.reduce((sum, s) => sum + s.score, 0);
  } else {
    // Use primary as baseline when disputed (guide will resolve)
    evaluation = primary;
  }

  // Apply penalties
  const totalPenalty = penalties.reduce((sum, p) => sum + p.deduction, 0);
  evaluation.totalScore = Math.max(0, evaluation.totalScore - totalPenalty);
  evaluation.penalties = penalties;

  return {
    evaluation,
    disagreement,
    primaryScores: primary,
    secondaryScores: secondary,
  };
}
