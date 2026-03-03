import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireGuide } from '../middleware/guide-auth';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler';
import { storage } from '../storage';
import { withJob } from '../utils/withJob';

export const guideRouter = Router();

// All guide routes require auth + guide role
guideRouter.use('/api/guide', requireAuth, requireGuide);

// Course CRUD
guideRouter.post('/api/guide/courses', asyncHandler(async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) throw new BadRequestError('Course name and code are required');

  const course = await storage.createCourse({
    name,
    code,
    guideId: req.authContext!.userId,
  });

  res.status(201).json(course);
}));

guideRouter.get('/api/guide/courses', asyncHandler(async (req, res) => {
  const courses = await storage.getCoursesByGuideId(req.authContext!.userId);
  res.json(courses);
}));

guideRouter.get('/api/guide/courses/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid course ID');

  const course = await storage.getCourseById(id);
  if (!course) throw new NotFoundError('Course not found');
  if (course.guideId !== req.authContext!.userId) throw new ForbiddenError();

  const enrollments = await storage.getCourseEnrollments(id);
  res.json({ ...course, enrollments });
}));

// List defenses in a course
guideRouter.get('/api/guide/courses/:id/defenses', asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.id);
  if (isNaN(courseId)) throw new BadRequestError('Invalid course ID');

  const course = await storage.getCourseById(courseId);
  if (!course) throw new NotFoundError('Course not found');
  if (course.guideId !== req.authContext!.userId) throw new ForbiddenError();

  const defenses = await storage.getDefensesByCourseId(courseId);
  res.json(defenses);
}));

// Review a defense submission (approve/reject/revision_requested)
guideRouter.post('/api/guide/defenses/:id/review', asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');

  const { reviewStatus, reviewNotes } = req.body;
  if (!['approved', 'rejected', 'revision_requested'].includes(reviewStatus)) {
    throw new BadRequestError('Invalid review status');
  }

  const submission = await storage.updateSubmissionReview(
    defenseId,
    reviewStatus,
    reviewNotes || null,
    req.authContext!.userId,
  );

  // Update defense status based on review
  if (reviewStatus === 'approved') {
    await storage.updateDefenseStatus(defenseId, 'approved');
    // Queue config generation job
    await withJob('arena:generate-config')
      .forPayload({ defenseId })
      .queue();
  } else if (reviewStatus === 'rejected') {
    await storage.updateDefenseStatus(defenseId, 'draft');
  } else if (reviewStatus === 'revision_requested') {
    await storage.updateDefenseStatus(defenseId, 'draft');
  }

  res.json(submission);
}));

// Inject surprise counterargument mid-debate
guideRouter.post('/api/guide/defenses/:id/inject', asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');
  if (defense.status !== 'active') throw new BadRequestError('Defense is not active');

  const { directive, round } = req.body;
  if (!directive) throw new BadRequestError('Directive text is required');

  const config = await storage.getConfigByDefenseId(defenseId);
  if (!config) throw new NotFoundError('Defense config not found');

  const existingInjections = (config.guideInjections as any[]) || [];
  await storage.updateConfig(defenseId, {
    guideInjections: [...existingInjections, { round: round || 0, directive }],
  });

  res.json({ status: 'injected' });
}));

// Override AI-generated config
guideRouter.post('/api/guide/defenses/:id/config', asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');

  const { opponentPersona, difficultyLevel, counterArguments, pivotTopics } = req.body;

  const config = await storage.updateConfig(defenseId, {
    ...(opponentPersona && { opponentPersona }),
    ...(difficultyLevel && { difficultyLevel }),
    ...(counterArguments && { counterArguments }),
    ...(pivotTopics && { pivotTopics }),
  });

  res.json(config);
}));

// Resolve evaluator disagreement
guideRouter.post('/api/guide/defenses/:id/resolve-disagreement', asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const defense = await storage.getDefenseById(defenseId);
  if (!defense) throw new NotFoundError('Defense not found');

  const { resolvedScores, notes } = req.body;
  if (!resolvedScores) throw new BadRequestError('Resolved scores are required');

  // Find the latest attempt with disagreement
  const attempts = defense.levelAttempts || [];
  const disputedAttempt = attempts.find((a: any) => a.evaluatorDisagreement);
  if (!disputedAttempt) throw new BadRequestError('No evaluator disagreement found');

  await storage.updateLevelAttempt(disputedAttempt.id, {
    evaluatorDisagreement: false,
    evaluationOutput: resolvedScores,
    finalScore: resolvedScores.totalScore,
  });

  await storage.updateDefenseTotalScore(defenseId, resolvedScores.totalScore);

  res.json({ status: 'resolved' });
}));

// Cohort analytics for a course (Phase 7)
guideRouter.get('/api/guide/courses/:id/analytics', asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.id);
  if (isNaN(courseId)) throw new BadRequestError('Invalid course ID');

  const course = await storage.getCourseById(courseId);
  if (!course) throw new NotFoundError('Course not found');
  if (course.guideId !== req.authContext!.userId) throw new ForbiddenError();

  const defenses = await storage.getDefensesByCourseId(courseId);

  // Compute analytics from defense data
  const completedDefenses = defenses.filter((d: any) => d.status === 'complete' || d.status === 'failed');
  const scores = completedDefenses.map((d: any) => d.totalScore).filter(Boolean) as number[];

  // Score distribution
  const scoreDistribution = {
    '0-5': scores.filter(s => s <= 5).length,
    '6-10': scores.filter(s => s >= 6 && s <= 10).length,
    '11-15': scores.filter(s => s >= 11 && s <= 15).length,
    '16-20': scores.filter(s => s >= 16 && s <= 20).length,
  };

  // Axis weakness clustering (from coaching prescriptions)
  const axisCounts: Record<string, number> = {};
  for (const defense of completedDefenses) {
    const coaching = await storage.getCoachingByDefenseId((defense as any).id);
    for (const c of coaching) {
      if (c.axis !== 'appeal') {
        axisCounts[c.axis] = (axisCounts[c.axis] || 0) + 1;
      }
    }
  }

  // Stalled students (active defenses with >7 rounds and no progress)
  const activeDefenses = defenses.filter((d: any) => d.status === 'active');

  res.json({
    totalDefenses: defenses.length,
    completedDefenses: completedDefenses.length,
    activeDefenses: activeDefenses.length,
    averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null,
    passRate: completedDefenses.length > 0
      ? Math.round(completedDefenses.filter((d: any) => d.status === 'complete').length / completedDefenses.length * 100)
      : null,
    scoreDistribution,
    weaknessCluster: Object.entries(axisCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([axis, count]) => ({ axis, count })),
  });
}));

// Review pending appeals (Phase 9)
guideRouter.get('/api/guide/defenses/:id/appeals', asyncHandler(async (req, res) => {
  const defenseId = parseInt(req.params.id);
  if (isNaN(defenseId)) throw new BadRequestError('Invalid defense ID');

  const coaching = await storage.getCoachingByDefenseId(defenseId);
  const appeals = coaching.filter(c => c.axis === 'appeal');

  res.json(appeals);
}));

// Resolve an appeal
guideRouter.post('/api/guide/appeals/:id/resolve', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid appeal ID');

  const { resolution } = req.body;
  if (!resolution || !['addressed', 'dismissed'].includes(resolution)) {
    throw new BadRequestError('Resolution must be "addressed" or "dismissed"');
  }

  const updated = await storage.updateCoachingStatus(id, resolution);
  res.json(updated);
}));

// Sparring peer profiles for a course (Phase 7)
guideRouter.get('/api/guide/courses/:id/peers', asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.id);
  if (isNaN(courseId)) throw new BadRequestError('Invalid course ID');

  const course = await storage.getCourseById(courseId);
  if (!course) throw new NotFoundError('Course not found');
  if (course.guideId !== req.authContext!.userId) throw new ForbiddenError();

  const peers = await storage.getSparringPeersByCourse(courseId);
  res.json(peers);
}));
