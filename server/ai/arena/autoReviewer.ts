import { callOpenRouterModel, extractJSON } from '../llm-utils';
import type { AutoReviewResult } from '@shared/types';

const REVIEW_MODEL = 'meta-llama/llama-3.1-8b-instruct';

/**
 * Automated pre-review of student submissions.
 * Checks: Is the POV defensible? Is evidence cited? Are sources present?
 * Used for sparring mode (auto-approve) and assessed mode (AI pre-screen before guide review).
 */
export async function autoReviewSubmission(submission: {
  pov: string;
  evidence: Array<{ claim: string; source: string; sourceUrl?: string }>;
  counterEvidence?: Array<{ claim: string; source: string; sourceUrl?: string }>;
}): Promise<AutoReviewResult> {
  try {
    const evidenceStr = submission.evidence
      .map((e, i) => `${i + 1}. Claim: "${e.claim}" — Source: ${e.source}${e.sourceUrl ? ` (${e.sourceUrl})` : ''}`)
      .join('\n');

    const raw = await callOpenRouterModel(
      REVIEW_MODEL,
      `You are a submission quality reviewer for an academic debate platform. Evaluate whether a student's position and evidence are sufficient to proceed to a debate.

Check these criteria:
1. Is the POV a defensible position (not a tautology, not purely subjective, can be argued for/against)?
2. Does the evidence contain at least 2 specific, cited claims with named sources?
3. Are the claims relevant to the stated position?
4. Is there enough substance to sustain a multi-round debate?

Return JSON:
{
  "pass": true/false,
  "feedback": ["specific feedback item 1", "specific feedback item 2"],
  "suggestedRevisions": ["suggestion 1 if needed"]
}

Be lenient — only fail submissions that are clearly undefensible, lack any real evidence, or are too vague to debate. Most submissions should pass.`,
      `## Student's Position
"${submission.pov}"

## Submitted Evidence
${evidenceStr}`,
      500,
      0.0,
    );

    const result = extractJSON(raw) as AutoReviewResult;
    return {
      pass: result.pass ?? true,
      feedback: result.feedback || [],
      suggestedRevisions: result.suggestedRevisions || [],
    };
  } catch (err: any) {
    console.error('[AutoReviewer] Review failed:', err.message);
    // On failure, default to pass (don't block students due to AI issues)
    return {
      pass: true,
      feedback: ['Automated review unavailable — submission accepted.'],
      suggestedRevisions: [],
    };
  }
}
