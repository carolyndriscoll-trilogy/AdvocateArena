import { callOpenRouterModel, extractJSON } from '../llm-utils';

const STALLING_MODEL = 'meta-llama/llama-3.1-8b-instruct';

interface StallingResult {
  isStalling: boolean;
  flags: string[];
  details: string;
}

/**
 * Detect repetition using simple word overlap (cosine-like similarity).
 * Returns similarity score 0-1 between two texts.
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  wordsA.forEach(word => {
    if (wordsB.has(word)) overlap++;
  });
  return overlap / Math.max(wordsA.size, wordsB.size);
}

/**
 * Check for stalling behavior: repetition and evasion.
 */
export async function detectStalling(
  currentMessage: string,
  previousMessages: Array<{ role: string; content: string }>,
): Promise<StallingResult> {
  const flags: string[] = [];

  // 1. Word count check (handled at route level, but double-check)
  const wordCount = currentMessage.trim().split(/\s+/).length;
  if (wordCount < 10) {
    flags.push('extremely_short_response');
  }

  // 2. Repetition check against previous user messages
  const previousUserMessages = previousMessages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content);

  for (const prev of previousUserMessages) {
    const similarity = textSimilarity(currentMessage, prev);
    if (similarity > 0.7) {
      flags.push('high_repetition');
      break;
    }
  }

  // 3. LLM-based evasion detection (cheap model)
  if (flags.length === 0) {
    try {
      const lastOpponentMessage = previousMessages
        .filter(m => m.role === 'assistant')
        .slice(-1)[0]?.content || '';

      const raw = await callOpenRouterModel(
        STALLING_MODEL,
        `You are a debate quality detector. Analyze the student's response to determine if they are evading the opponent's challenge.

Evasion indicators:
- Changing the subject without addressing the challenge
- Making vague platitudes instead of specific arguments
- Repeating their original position without engaging with criticism
- Using filler language without substantive content

Return JSON: {"isEvading": boolean, "reason": "brief explanation"}`,
        `Opponent's challenge: "${lastOpponentMessage}"

Student's response: "${currentMessage}"`,
        200,
        0.0
      );

      const result = extractJSON(raw) as { isEvading: boolean; reason: string };
      if (result.isEvading) {
        flags.push('evasion_detected');
      }
    } catch (err: any) {
      console.error('[StallingDetector] LLM check failed:', err.message);
      // Don't penalize on detector failure
    }
  }

  return {
    isStalling: flags.length > 0,
    flags,
    details: flags.length > 0
      ? `Stalling detected: ${flags.join(', ')}`
      : 'No stalling detected',
  };
}
