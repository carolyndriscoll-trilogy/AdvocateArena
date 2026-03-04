import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler';
import { storage } from '../storage';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { buildOpponentSystemPrompt, buildRoundDirective } from '../ai/arena/opponentBuilder';
import { detectStalling } from '../ai/arena/stallingDetector';
import { getMidDebateSignals, computeAdaptiveStateUpdate } from '../ai/arena/adaptiveEngine';
import { autoReviewSubmission } from '../ai/arena/autoReviewer';
import { getAvailableSequences } from '../ai/arena/sparringSequences';
import { withJob } from '../utils/withJob';
import { storeMessages } from '../utils/honcho';
import type { ConversationMessage, AdaptiveState, OpponentPersona, DifficultyLevel } from '@shared/types';

export const defensesRouter = Router();

// Create a new defense
defensesRouter.post('/api/defenses', requireAuth, asyncHandler(async (req, res) => {
  const { title, courseId, mode, maxRounds, inputMode } = req.body;
  if (!title) throw new BadRequestError('Title is required');
  if (maxRounds !== undefined && (maxRounds < 1 || maxRounds > 10)) {
    throw new BadRequestError('maxRounds must be between 1 and 10');
  }

  const defense = await storage.createDefense({
    userId: req.authContext!.userId,
    courseId: courseId || null,
    mode: mode || 'assessed',
    title,
    ...(maxRounds && { maxRounds }),
    ...(inputMode && { inputMode }),
  });

  res.status(201).json(defense);
}));

// List user's defenses
defensesRouter.get('/api/defenses', requireAuth, asyncHandler(async (req, res) => {
  const defenses = await storage.getDefensesByUserId(req.authContext!.userId);
  res.json(defenses);
}));

// Get defense detail
defensesRouter.get('/api/defenses/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(id);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId && req.authContext!.role === 'user') {
    throw new ForbiddenError();
  }

  res.json(defense);
}));

// Submit POV + evidence
defensesRouter.post('/api/defenses/:id/submission', requireAuth, asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId) throw new ForbiddenError();
  if (defense.status !== 'draft') throw new BadRequestError('Defense is not in draft status');

  const { pov, evidence, counterEvidence, sourceDocuments } = req.body;
  if (!pov) throw new BadRequestError('Point of view is required');
  if (!evidence || !Array.isArray(evidence) || evidence.length === 0) {
    throw new BadRequestError('At least one evidence item is required');
  }

  const submission = await storage.createSubmission({
    defenseId,
    pov,
    evidence,
    counterEvidence: counterEvidence || [],
    sourceDocuments: sourceDocuments || [],
  });

  if (defense.mode === 'sparring') {
    // Sparring mode: auto-approve, generate config, set active
    await storage.updateSubmissionReview(defenseId, 'approved', 'Auto-approved (sparring mode)', 'system');
    await storage.updateDefenseStatus(defenseId, 'approved');
    // Queue config generation
    await withJob('arena:generate-config').forPayload({ defenseId }).queue();
  } else {
    // Assessed mode: run auto-review, store result, set under_review for guide
    await storage.updateDefenseStatus(defenseId, 'submitted');
    // Run auto-review in background (don't block response)
    autoReviewSubmission({ pov, evidence, counterEvidence }).then(async (result) => {
      try {
        await storage.updateAutoReviewResult(defenseId, result);
        if (result.pass) {
          await storage.updateDefenseStatus(defenseId, 'under_review');
        }
      } catch (err: any) {
        console.error('[AutoReview] Failed to store result:', err.message);
      }
    });
  }

  res.status(201).json(submission);
}));

// Start debate (create level attempt)
defensesRouter.post('/api/defenses/:id/start', requireAuth, asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId) throw new ForbiddenError();
  if (defense.status !== 'approved' && defense.status !== 'active') {
    throw new BadRequestError('Defense must be approved before starting debate');
  }

  // Check for existing active attempt
  const existingAttempt = await storage.getActiveLevelAttempt(defenseId);
  if (existingAttempt) {
    return res.json(existingAttempt);
  }

  const attempt = await storage.createLevelAttempt(defenseId);
  await storage.updateDefenseStatus(defenseId, 'active');

  res.status(201).json(attempt);
}));

// Stream debate round — full Vercel AI SDK streaming implementation
defensesRouter.post('/api/defenses/:id/debate', requireAuth, asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId) throw new ForbiddenError();
  if (defense.status !== 'active') throw new BadRequestError('Defense is not active');

  const { message } = req.body;
  if (!message) throw new BadRequestError('Message is required');

  const wordCount = message.trim().split(/\s+/).length;

  const attempt = await storage.getActiveLevelAttempt(defenseId);
  if (!attempt) throw new NotFoundError('No active level attempt');

  const maxRounds = defense.maxRounds || 10;
  const currentRound = attempt.currentRound + 1;
  if (currentRound > maxRounds) {
    throw new BadRequestError('Debate has reached maximum rounds');
  }

  const submission = defense.submission;
  if (!submission) throw new NotFoundError('No submission found');
  const config = defense.config;
  if (!config) throw new NotFoundError('No config found');

  // Run stalling detection
  const conversationHistory = (attempt.conversationHistory as ConversationMessage[]) || [];
  const stallingResult = await detectStalling(message, conversationHistory);

  const stallingFlags = stallingResult.isStalling ? stallingResult.flags : [];
  const penaltyLog = [...((attempt.penaltyLog as any[]) || [])];
  if (stallingResult.isStalling) {
    penaltyLog.push({
      round: currentRound,
      type: 'stalling',
      details: stallingResult.details,
    });
  }

  // Track filler penalties
  const fillerPenalties = [...((attempt.fillerPenalties as any[]) || [])];
  if (stallingResult.fillerCount > 0 || stallingResult.repetitionScore > 0.5) {
    fillerPenalties.push({
      round: currentRound,
      fillerCount: stallingResult.fillerCount,
      repetitionScore: stallingResult.repetitionScore,
      penaltyPoints: stallingResult.penaltyPoints,
    });
  }

  // Add student message to history
  const userMessage: ConversationMessage = {
    role: 'user',
    content: message,
    round: currentRound,
    timestamp: new Date().toISOString(),
    wordCount,
    stallingFlags,
  };
  const updatedHistory = [...conversationHistory, userMessage];

  // Build opponent prompt
  const adaptiveState = (attempt.adaptiveState as AdaptiveState) || {
    currentDifficulty: config.difficultyLevel || 'curious_skeptic',
    evidenceUse: 0.5,
    responsiveness: 0.5,
    clarity: 0.5,
    upgradeTriggered: false,
  };

  const systemPrompt = buildOpponentSystemPrompt({
    persona: (config.opponentPersona || 'philosopher') as OpponentPersona,
    difficulty: adaptiveState.currentDifficulty as DifficultyLevel,
    studentPov: submission.pov,
    studentEvidence: submission.evidence as any[],
    counterArguments: (config.counterArguments as string[]) || [],
    inferredField: config.inferredField || undefined,
  });

  // Build round directive
  const roundDirective = buildRoundDirective({
    round: currentRound,
    maxRounds,
    adaptiveState,
    counterArguments: (config.counterArguments as string[]) || [],
    pivotTopics: (config.pivotTopics as string[]) || [],
    guideInjections: (config.guideInjections as any[]) || [],
  });

  // Build messages for AI
  const aiMessages = updatedHistory.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Add round directive as a developer message if present
  if (roundDirective) {
    aiMessages.push({
      role: 'user' as const,
      content: `[SYSTEM DIRECTIVE — NOT VISIBLE TO STUDENT] ${roundDirective}`,
    });
  }

  // Run adaptive signals BEFORE streaming to get coaching nudge
  let coachingNudge: string | undefined;
  try {
    const lastOpponentMsg = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-1)[0]?.content || '';
    const signals = await getMidDebateSignals(message, lastOpponentMsg);
    coachingNudge = signals.coachingNudge;
    // Pre-compute adaptive state (will finalize in onFinish)
    var precomputedAdaptiveState = computeAdaptiveStateUpdate(adaptiveState, signals, currentRound);
  } catch (err: any) {
    console.error('[Debate] Adaptive signal failed:', err.message);
    var precomputedAdaptiveState = adaptiveState;
  }

  // Send coaching nudge as a header (available before stream starts)
  if (coachingNudge) {
    res.setHeader('X-Coaching-Nudge', encodeURIComponent(coachingNudge));
  }
  res.setHeader('X-Current-Round', currentRound.toString());
  res.setHeader('X-Max-Rounds', maxRounds.toString());

  // Stream with Vercel AI SDK
  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250514'),
    system: systemPrompt,
    messages: aiMessages,
    onFinish: async ({ text: responseText }) => {
      // Persist updated conversation
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: responseText,
        round: currentRound,
        timestamp: new Date().toISOString(),
      };

      const finalHistory = [...updatedHistory, assistantMessage];

      // Update attempt in DB
      await storage.updateLevelAttempt(attempt.id, {
        conversationHistory: finalHistory,
        currentRound,
        adaptiveState: precomputedAdaptiveState,
        penaltyLog,
        fillerPenalties,
      });

      // After final round: queue evaluation job
      if (currentRound >= maxRounds) {
        await withJob('arena:evaluate')
          .forPayload({ defenseId, attemptId: attempt.id })
          .queue();
      }

      // Fire-and-forget Honcho storage
      storeMessages(
        `arena-${defenseId}-${attempt.id}`,
        defense.userId,
        'arena-agent',
        [userMessage, assistantMessage],
      );
    },
  });

  // Pipe streaming response
  result.pipeTextStreamToResponse(res);
}));

// Get evaluation results
defensesRouter.get('/api/defenses/:id/scores', requireAuth, asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId && req.authContext!.role === 'user') {
    throw new ForbiddenError();
  }

  const attempts = defense.levelAttempts || [];
  const coaching = await storage.getCoachingByDefenseId(defenseId);

  res.json({
    defense: {
      id: defense.id,
      title: defense.title,
      status: defense.status,
      totalScore: defense.totalScore,
    },
    attempts,
    coaching,
  });
}));

// Post-debate reflection
defensesRouter.post('/api/defenses/:id/reflection', requireAuth, asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId) throw new ForbiddenError();

  const { reflection } = req.body;
  if (!reflection) throw new BadRequestError('Reflection text is required');
  if (reflection.length < 300) throw new BadRequestError('Reflection must be at least 300 characters');
  if (reflection.length > 3000) throw new BadRequestError('Reflection must be under 3000 characters');

  const result = await storage.createReflection({
    defenseId,
    reflection,
  });

  res.status(201).json(result);
}));

// Submit revised position after debate
defensesRouter.post('/api/defenses/:id/revised-pov', requireAuth, asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId) throw new ForbiddenError();
  if (defense.status !== 'complete' && defense.status !== 'failed') {
    throw new BadRequestError('Can only submit revised position after debate completion');
  }

  const { revisedPov } = req.body;
  if (!revisedPov || !revisedPov.trim()) throw new BadRequestError('Revised position is required');

  const updated = await storage.updateRevisedPov(defenseId, revisedPov.trim());
  res.json(updated);
}));

// Get competitive stack for a defense
defensesRouter.get('/api/defenses/:id/competitive-stack', requireAuth, asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId && req.authContext!.role === 'user') {
    throw new ForbiddenError();
  }

  const stack = await storage.getCompetitiveStackByDefenseId(defenseId);
  if (!stack) throw new NotFoundError('Competitive stack not yet generated');

  res.json(stack);
}));

// Submit appeal (anti-gaming: Phase 9)
defensesRouter.post('/api/defenses/:id/appeal', requireAuth, asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.userId !== req.authContext!.userId) throw new ForbiddenError();
  if (defense.status !== 'complete' && defense.status !== 'failed') {
    throw new BadRequestError('Can only appeal completed or failed defenses');
  }

  const { justification, citedExchanges } = req.body;
  if (!justification) throw new BadRequestError('Justification is required');

  const wordCount = justification.trim().split(/\s+/).length;
  if (wordCount < 50) throw new BadRequestError('Appeal must be at least 50 words');
  if (wordCount > 200) throw new BadRequestError('Appeal must be under 200 words');

  if (!citedExchanges || !Array.isArray(citedExchanges) || citedExchanges.length === 0) {
    throw new BadRequestError('Must cite at least one specific exchange (round number)');
  }

  // Store appeal as a coaching prescription with special axis
  const appeal = await storage.createCoachingPrescription({
    userId: req.authContext!.userId,
    defenseId,
    axis: 'appeal',
    prescription: JSON.stringify({ justification, citedExchanges, status: 'pending' }),
  });

  res.status(201).json(appeal);
}));

// Get available sparring sequences
defensesRouter.get('/api/sparring-sequences', requireAuth, asyncHandler(async (_req, res) => {
  res.json(getAvailableSequences());
}));

// Get user's coaching prescriptions across all defenses
defensesRouter.get('/api/coaching', requireAuth, asyncHandler(async (req, res) => {
  const prescriptions = await storage.getCoachingByUserId(req.authContext!.userId);
  res.json(prescriptions);
}));

// Update coaching prescription status (mark as addressed/dismissed)
defensesRouter.post('/api/coaching/:id/status', requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid coaching ID');

  const { status } = req.body;
  if (!status || !['addressed', 'dismissed'].includes(status)) {
    throw new BadRequestError('Status must be "addressed" or "dismissed"');
  }

  const updated = await storage.updateCoachingStatus(id, status);
  res.json(updated);
}));
