import type { SparringSequenceType } from '@shared/types';

interface SequenceDefinition {
  name: string;
  description: string;
  rounds: number;
  opponentBehavior: string;
  scoringWeights?: Partial<Record<string, number>>; // axis -> weight multiplier
}

export const SPARRING_SEQUENCES: Record<SparringSequenceType, SequenceDefinition> = {
  foundations: {
    name: 'Foundations',
    description: 'Basic position defense. Establish and articulate your core argument.',
    rounds: 3,
    opponentBehavior: 'Ask clarifying questions. Challenge the student to articulate their position more precisely. Be encouraging but probe for specificity. Focus on whether they can state their position clearly and support it with at least one piece of evidence.',
  },
  evidence_stress_test: {
    name: 'Evidence Stress Test',
    description: 'Every claim is challenged for its source. Prove what you know.',
    rounds: 5,
    opponentBehavior: 'Challenge EVERY factual claim the student makes. Ask "What is your source for that?" and "How do you know this is reliable?" for each assertion. Accept only specific, named sources. Push back on vague attributions like "studies show" or "experts say". You are testing their evidence literacy, not their argument quality.',
    scoringWeights: { factual_accuracy: 1.5 },
  },
  pressure_chamber: {
    name: 'Pressure Chamber',
    description: 'Aggressive opponent, composure focus. Stay cool under fire.',
    rounds: 7,
    opponentBehavior: 'Be aggressively challenging but intellectually honest. Press hard on every weakness. Use rapid-fire follow-up questions. If they dodge, call it out immediately. Challenge their reasoning, their evidence, and their conclusions in quick succession. The goal is to test whether they can maintain composure and analytical rigor under sustained intellectual pressure.',
    scoringWeights: { composure_under_pressure: 1.5 },
  },
  systems_mapping: {
    name: 'Systems Mapping',
    description: 'Connections and implications. Show how your argument fits the bigger picture.',
    rounds: 5,
    opponentBehavior: 'Focus on implications, second-order effects, and connections. Ask "So what?" after every point. Challenge them to connect their argument to broader systems, other fields, and real-world consequences. Press for novel connections between ideas. You are testing their ability to think beyond their specific position into systemic understanding.',
    scoringWeights: { depth_of_reasoning: 1.5 },
  },
  mirror_match: {
    name: 'Mirror Match',
    description: 'Defend the opposing position. Prove you truly understand both sides.',
    rounds: 5,
    opponentBehavior: 'You are now defending the STUDENT\'S original position while they must argue against it. Be a strong advocate for their original stance. Use their own evidence and reasoning. The student must demonstrate genuine understanding of the opposing view by constructing compelling arguments against their own position. Award credit for intellectual honesty and depth of counter-argument.',
    scoringWeights: { epistemic_honesty: 1.5, argument_evolution: 1.5 },
  },
};

/**
 * Build a modified defense config for a sparring sequence.
 */
export function buildSequenceConfig(
  sequenceType: SparringSequenceType,
  submission: { pov: string; evidence: Array<{ claim: string; source: string }> },
) {
  const sequence = SPARRING_SEQUENCES[sequenceType];
  if (!sequence) throw new Error(`Unknown sequence type: ${sequenceType}`);

  return {
    maxRounds: sequence.rounds,
    opponentBehaviorOverride: sequence.opponentBehavior,
    scoringWeights: sequence.scoringWeights,
    sequenceType,
    sequenceName: sequence.name,
    // Mirror match inverts the POV
    invertedPov: sequenceType === 'mirror_match'
      ? `Argue AGAINST the following position: "${submission.pov}"`
      : undefined,
  };
}

/**
 * Get all available sequences for display.
 */
export function getAvailableSequences() {
  return Object.entries(SPARRING_SEQUENCES).map(([key, seq]) => ({
    type: key as SparringSequenceType,
    name: seq.name,
    description: seq.description,
    rounds: seq.rounds,
  }));
}
