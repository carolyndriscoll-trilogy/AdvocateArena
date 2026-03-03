import { callOpenRouterModel, extractJSON } from '../llm-utils';

const CONFIG_MODEL = 'anthropic/claude-opus-4';

interface GeneratedConfig {
  inferredField: string;
  counterArguments: string[];
  pivotTopics: string[];
  recommendedPersona: string;
  recommendedDifficulty: string;
}

/**
 * Generate defense config after a submission is approved.
 * Analyzes the student's POV and evidence to create counterarguments,
 * pivot topics, and recommend an opponent persona + difficulty level.
 */
export async function generateDefenseConfig(
  pov: string,
  evidence: Array<{ claim: string; source: string; sourceUrl?: string }>,
): Promise<GeneratedConfig> {
  const evidenceStr = evidence
    .map((e, i) => `${i + 1}. "${e.claim}" (${e.source})`)
    .join('\n');

  const raw = await callOpenRouterModel(
    CONFIG_MODEL,
    `You are an academic debate preparation system. Analyze a student's position and evidence to generate challenging debate material.

## Task
Given the student's point of view and evidence, generate:
1. The academic field this defense belongs to
2. 8 strong counter-arguments that challenge their position from different angles
3. 3 surprise pivot topics — related but unexpected angles the student likely hasn't prepared for
4. Recommended opponent persona (philosopher|empiricist|contrarian|strategist)
5. Recommended starting difficulty (curious_skeptic|domain_expert)

Return JSON:
{
  "inferredField": "Educational Psychology",
  "counterArguments": [
    "Research by X (2023) found the opposite...",
    "This argument assumes Y, but Z contradicts...",
    ...
  ],
  "pivotTopics": [
    "The ethical implications of...",
    "How does this apply in the context of...",
    "What about the historical precedent of..."
  ],
  "recommendedPersona": "empiricist",
  "recommendedDifficulty": "curious_skeptic"
}

IMPORTANT:
- Counter-arguments should be substantive and specific — not generic dismissals
- Each counter-argument should attack from a different angle (methodology, ethics, scope, competing evidence, etc.)
- Pivot topics should be genuinely surprising but intellectually relevant
- Persona recommendation should match the nature of the student's argument (empirical claims → empiricist, theoretical → philosopher, etc.)
- Start with curious_skeptic unless the evidence is clearly advanced/graduate-level`,
    `## Student's Position
"${pov}"

## Submitted Evidence
${evidenceStr}`,
    3000,
    0.3,
  );

  return extractJSON(raw) as GeneratedConfig;
}
