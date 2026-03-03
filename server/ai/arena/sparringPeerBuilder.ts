import { callOpenRouterModel, extractJSON } from '../llm-utils';
import { getLearnerContext } from '../../utils/honcho';

const PEER_MODEL = 'meta-llama/llama-3.1-8b-instruct';

interface ArgumentationPattern {
  rhetoricalMoves: string[];
  typicalEvasions: string[];
  favoredEvidence: string[];
}

interface PeerProfile {
  argumentationPattern: ArgumentationPattern;
  strengthAxes: string[];
  weaknessAxes: string[];
}

/**
 * Build a sparring peer profile from a student's debate history.
 * Requires 3+ completed defenses to generate a meaningful profile.
 * Pulls Honcho learner context + conversation histories.
 */
export async function buildPeerProfile(
  userId: string,
  conversations: Array<{ role: string; content: string }[]>,
  scoringHistory: Array<{ axis: string; score: number }[]>,
): Promise<PeerProfile> {
  // Get Honcho learner context if available
  let learnerContext = '';
  try {
    learnerContext = await getLearnerContext(userId, 'arena-agent') || '';
  } catch {
    // Graceful degradation
  }

  // Flatten all student messages for pattern analysis
  const studentMessages = conversations
    .flat()
    .filter(m => m.role === 'user')
    .map(m => m.content);

  const sampleMessages = studentMessages.slice(-15).join('\n---\n');

  // Compute average scores per axis
  const axisAverages: Record<string, number[]> = {};
  for (const scores of scoringHistory) {
    for (const { axis, score } of scores) {
      if (!axisAverages[axis]) axisAverages[axis] = [];
      axisAverages[axis].push(score);
    }
  }

  const axisReport = Object.entries(axisAverages)
    .map(([axis, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return `${axis}: ${avg.toFixed(1)}/4`;
    })
    .join(', ');

  const raw = await callOpenRouterModel(
    PEER_MODEL,
    `You are an argumentation analyst. Given a sample of a student's debate responses and their scoring history, extract their argumentation fingerprint.

Return JSON:
{
  "argumentationPattern": {
    "rhetoricalMoves": ["list 3-5 moves this student commonly uses (e.g., 'appeal to authority', 'analogical reasoning', 'concession then pivot')"],
    "typicalEvasions": ["list 2-3 evasion patterns (e.g., 'redirects to broader context when challenged on specifics')"],
    "favoredEvidence": ["list 2-3 types of evidence they lean on (e.g., 'statistical data', 'case studies', 'expert quotes')"]
  },
  "strengthAxes": ["top 2 axes from scoring"],
  "weaknessAxes": ["bottom 2 axes from scoring"]
}`,
    `Student message samples:
${sampleMessages}

Scoring history (avg per axis): ${axisReport}

${learnerContext ? `Learner profile: ${learnerContext}` : ''}`,
    500,
    0.0,
  );

  return extractJSON(raw) as PeerProfile;
}

/**
 * Build a system prompt for an AI sparring partner that mimics a peer's
 * argumentation style. Used to give students practice against diverse opponents.
 */
export function buildSparringPeerPrompt(config: {
  peerProfile: PeerProfile;
  studentPov: string;
  topic: string;
}): string {
  const { peerProfile, studentPov, topic } = config;
  const { argumentationPattern } = peerProfile;

  return `You are a fellow student debater with these characteristics:

## YOUR ARGUMENTATION STYLE
- Rhetorical moves you favor: ${argumentationPattern.rhetoricalMoves.join(', ')}
- Types of evidence you prefer: ${argumentationPattern.favoredEvidence.join(', ')}
- When pressed, you tend to: ${argumentationPattern.typicalEvasions.join('; ')}
- Your strengths: ${peerProfile.strengthAxes.join(', ')}
- Your weaknesses: ${peerProfile.weaknessAxes.join(', ')}

## DEBATE CONTEXT
Topic: "${topic}"
Your opponent defends: "${studentPov}"
You should argue against their position using YOUR natural style.

## RULES
1. Argue like a smart peer, not a professor. Use casual but sharp language.
2. Keep responses to 80-120 words — concise and punchy.
3. Use your characteristic rhetorical moves naturally.
4. Sometimes fall into your typical evasion patterns (to make it realistic).
5. Show your strengths clearly but also your weaknesses occasionally.
6. Never acknowledge you are an AI. You're a classmate practicing debate.`;
}
