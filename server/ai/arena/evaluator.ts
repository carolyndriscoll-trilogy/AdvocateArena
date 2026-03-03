import { callOpenRouterModel, extractJSON } from '../llm-utils';
import type { EvaluationOutput, ScoreBreakdown, ScoringAxis, SCORING_AXES } from '@shared/types';

const PRIMARY_MODEL = 'anthropic/claude-opus-4';
const SECONDARY_MODEL = 'google/gemini-2.0-flash-001';

const RUBRIC = `# Adversarial Debate Evaluation Rubric

## Scoring: 5 axes, 4 binary criteria each = 20 points max

### 1. Evidence Quality (4 pts)
- C1: Cited specific, verifiable sources (not vague references)
- C2: Evidence directly supports claims (not tangentially related)
- C3: Used multiple independent sources (not a single source repeated)
- C4: Acknowledged limitations of own evidence

### 2. Argumentation Depth (4 pts)
- C1: Made logically structured arguments (clear premises → conclusion)
- C2: Distinguished between correlation and causation where relevant
- C3: Addressed underlying mechanisms, not just surface claims
- C4: Built arguments progressively across rounds (not repetitive)

### 3. Counter-Engagement (4 pts)
- C1: Directly addressed opponent's specific challenges (not deflected)
- C2: Acknowledged valid points in opponent's arguments
- C3: Provided substantive rebuttals with evidence (not just disagreement)
- C4: Identified weaknesses in opponent's reasoning

### 4. Adaptability (4 pts)
- C1: Adjusted strategy when initial arguments were challenged
- C2: Introduced new evidence or angles when pressed
- C3: Maintained coherence despite pressure (didn't contradict self)
- C4: Handled surprise topics or pivots with substantive responses

### 5. Synthesis (4 pts)
- C1: Connected evidence across multiple sources/domains
- C2: Addressed the "so what" — connected argument to broader implications
- C3: Demonstrated nuanced understanding (not black/white thinking)
- C4: Steelmanned opponent's position before countering it`;

const EVALUATION_PROMPT = `${RUBRIC}

## Instructions
Evaluate the following debate transcript. For each criterion, determine MET or NOT MET and quote specific evidence from the transcript.

Return JSON in this exact format:
{
  "scores": [
    {
      "axis": "evidence_quality",
      "criteria": [
        {"name": "Cited specific verifiable sources", "met": true, "evidence": "In round 3, student cited..."},
        {"name": "Evidence directly supports claims", "met": true, "evidence": "..."},
        {"name": "Used multiple independent sources", "met": false, "evidence": "Student only referenced..."},
        {"name": "Acknowledged evidence limitations", "met": false, "evidence": "Never addressed limitations..."}
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
