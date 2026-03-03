/**
 * Honcho Client Module — Learner profile persistence for Advocate's Arena.
 *
 * Architecture (Peer-based):
 *   Workspace: "advocates-arena" (or env HONCHO_WORKSPACE_ID)
 *   Peers:
 *     student-{userId}    ← the learner
 *     arena-agent          ← debate & evaluation identity
 *
 * All public functions return null/no-op when HONCHO_API_KEY is not set.
 * All wrapped in try/catch — Honcho failures never break the app.
 */

import { Honcho } from '@honcho-ai/sdk';

const honcho = process.env.HONCHO_API_KEY
  ? new Honcho({
      apiKey: process.env.HONCHO_API_KEY,
      workspaceId: process.env.HONCHO_WORKSPACE_ID || 'advocates-arena',
      environment: 'production',
    })
  : null;

export function isHonchoConfigured(): boolean {
  return honcho !== null;
}

export async function getLearnerContext(
  userId: string,
  agentName: string = 'arena-agent',
  options?: { searchQuery?: string }
): Promise<string | null> {
  if (!honcho) return null;

  try {
    const agentPeer = await honcho.peer(agentName);
    const studentPeerId = `student-${userId}`;

    const query = options?.searchQuery
      ? `Summarize this student's argumentation patterns, strengths, and growth areas, especially related to: ${options.searchQuery}. Be concise (under 300 words).`
      : `Summarize this student's argumentation patterns, strengths, and growth areas. Be concise (under 300 words).`;

    const response = await agentPeer.chat(query, { target: studentPeerId });
    if (!response || response.trim().length < 20) return null;
    return response.trim();
  } catch (err: any) {
    console.error(`[Honcho] getLearnerContext failed for user ${userId}: ${err.message}`);
    return null;
  }
}

export async function storeMessages(
  sessionKey: string,
  userId: string,
  agentName: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  if (!honcho) return;

  try {
    const studentPeer = await honcho.peer(`student-${userId}`);
    const agentPeer = await honcho.peer(agentName);
    const session = await honcho.session(sessionKey);

    await session.addPeers([studentPeer, agentPeer]);

    const messageInputs = messages
      .filter(m => m.content && m.content.trim().length > 0)
      .map(m => {
        const peer = m.role === 'user' ? studentPeer : agentPeer;
        return peer.message(
          typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        );
      });

    if (messageInputs.length > 0) {
      await session.addMessages(messageInputs);
    }
  } catch (err: any) {
    console.error(`[Honcho] storeMessages failed for session ${sessionKey}: ${err.message}`);
  }
}

export async function storeObservation(
  userId: string,
  type: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!honcho) return;

  try {
    const agentPeer = await honcho.peer('arena-agent');
    const studentPeerId = `student-${userId}`;

    const conclusionContent = metadata
      ? `[${type}] ${content} | metadata: ${JSON.stringify(metadata)}`
      : `[${type}] ${content}`;

    await agentPeer.conclusionsOf(studentPeerId).create({
      content: conclusionContent,
    });
  } catch (err: any) {
    console.error(`[Honcho] storeObservation failed for user ${userId}: ${err.message}`);
  }
}
