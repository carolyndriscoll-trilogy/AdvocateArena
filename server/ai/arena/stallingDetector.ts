import { callOpenRouterModel, extractJSON } from '../llm-utils';
import type { StallingResultV2 } from '@shared/types';

const STALLING_MODEL = 'meta-llama/llama-3.1-8b-instruct';

// Common filler words/phrases to count
const FILLER_PATTERNS = [
  /\bum\b/gi,
  /\buh\b/gi,
  /\blike\b(?!\s+(?:a|the|this|that|to|in))/gi, // "like" as filler, not comparison
  /\byou know\b/gi,
  /\bi mean\b/gi,
  /\bbasically\b/gi,
  /\bliterally\b/gi,
  /\bkind of\b/gi,
  /\bsort of\b/gi,
  /\byeah so\b/gi,
  /\banyway\b/gi,
];

/**
 * Count filler words/phrases in a message.
 */
function countFillers(text: string): number {
  let count = 0;
  for (const pattern of FILLER_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
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
 * Check for stalling behavior: repetition, evasion, and filler tracking.
 * No hard word cap — filler detection replaces it per v2 spec.
 */
export async function detectStalling(
  currentMessage: string,
  previousMessages: Array<{ role: string; content: string }>,
): Promise<StallingResultV2> {
  const flags: string[] = [];
  const fillerCount = countFillers(currentMessage);
  let repetitionScore = 0;

  // 1. Extremely short response check (still useful)
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
    repetitionScore = Math.max(repetitionScore, similarity);
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
    }
  }

  // Calculate penalty points
  // Filler penalty: 0.25 pts per 5+ fillers in a single message
  const fillerPenalty = fillerCount >= 5 ? Math.floor(fillerCount / 5) * 0.25 : 0;
  // Repetition penalty: 0.5 pts if repetitionScore > 0.7
  const repetitionPenalty = repetitionScore > 0.7 ? 0.5 : 0;
  // Stalling penalty: 1 pt for evasion/extremely short
  const stallingPenalty = flags.includes('evasion_detected') || flags.includes('extremely_short_response') ? 1 : 0;
  const penaltyPoints = fillerPenalty + repetitionPenalty + stallingPenalty;

  return {
    isStalling: flags.length > 0,
    flags,
    details: flags.length > 0
      ? `Stalling detected: ${flags.join(', ')}`
      : 'No stalling detected',
    fillerCount,
    repetitionScore,
    penaltyPoints,
  };
}
