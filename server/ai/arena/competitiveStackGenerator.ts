import { callOpenRouterModel, extractJSON } from '../llm-utils';

const STACK_MODEL = 'anthropic/claude-opus-4';

interface CompetitiveStack {
  thesis: string;
  evidence: string[];
  divergencePoints: string[];
}

interface RivalPersona {
  name: string;
  specialty: string;
  argumentStyle: string;
}

/**
 * Generate a competitive stack — an alternative framework using the same evidence
 * to reach a different conclusion. This challenges students to see their evidence
 * from a completely different analytical lens.
 */
export async function generateCompetitiveStack(
  pov: string,
  evidence: Array<{ claim: string; source: string }>,
): Promise<{ framework: CompetitiveStack; rivalPersona: RivalPersona }> {
  const evidenceList = evidence.map((e, i) => `${i + 1}. "${e.claim}" (Source: ${e.source})`).join('\n');

  const raw = await callOpenRouterModel(
    STACK_MODEL,
    `You are an expert academic debate architect. Given a student's defended thesis and their supporting evidence, construct a COMPETITIVE STACK — an equally valid alternative framework that uses the SAME evidence to support a DIFFERENT conclusion.

Rules:
- The alternative thesis must be intellectually honest and defensible
- Use the student's own evidence, reinterpreted through a different lens
- Identify 3-5 specific divergence points where the interpretations split
- Create a rival persona who would naturally champion this alternative view

Return JSON:
{
  "framework": {
    "thesis": "The alternative thesis statement",
    "evidence": ["Reinterpretation 1 of their evidence", "Reinterpretation 2", ...],
    "divergencePoints": ["Point where interpretations diverge 1", ...]
  },
  "rivalPersona": {
    "name": "A fitting academic archetype name (e.g., 'The Structuralist')",
    "specialty": "Their intellectual domain",
    "argumentStyle": "How they argue (e.g., 'methodological criticism', 'historical contextualization')"
  }
}`,
    `Student's thesis: "${pov}"

Student's evidence:
${evidenceList}`,
    2000,
    0.7,
  );

  return extractJSON(raw) as { framework: CompetitiveStack; rivalPersona: RivalPersona };
}
