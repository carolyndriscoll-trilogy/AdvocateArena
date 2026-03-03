import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireGuide } from '../middleware/guide-auth';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler';
import { storage } from '../storage';

export const gauntletRouter = Router();

// ─── Guide: Create + manage gauntlet events ────────────────────────────────

gauntletRouter.post('/api/guide/gauntlet', requireAuth, requireGuide, asyncHandler(async (req, res) => {
  const { courseId, name, config, scheduledAt } = req.body;
  if (!courseId || !name) throw new BadRequestError('Course ID and name are required');

  const course = await storage.getCourseById(courseId);
  if (!course) throw new NotFoundError('Course not found');
  if (course.guideId !== req.authContext!.userId) throw new ForbiddenError();

  const event = await storage.createGauntletEvent({
    courseId,
    name,
    config: config || undefined,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
  });

  res.status(201).json(event);
}));

gauntletRouter.get('/api/guide/courses/:courseId/gauntlet', requireAuth, requireGuide, asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  if (isNaN(courseId)) throw new BadRequestError('Invalid course ID');

  const course = await storage.getCourseById(courseId);
  if (!course) throw new NotFoundError('Course not found');
  if (course.guideId !== req.authContext!.userId) throw new ForbiddenError();

  const events = await storage.getGauntletEventsByCourse(courseId);
  res.json(events);
}));

gauntletRouter.post('/api/guide/gauntlet/:id/start', requireAuth, requireGuide, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid gauntlet ID');

  const event = await storage.getGauntletEventById(id);
  if (!event) throw new NotFoundError('Gauntlet event not found');
  if (event.status !== 'upcoming') throw new BadRequestError('Gauntlet is not in upcoming status');

  await storage.updateGauntletEventStatus(id, 'active');
  res.json({ status: 'active' });
}));

gauntletRouter.post('/api/guide/gauntlet/:id/complete', requireAuth, requireGuide, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid gauntlet ID');

  const event = await storage.getGauntletEventById(id);
  if (!event) throw new NotFoundError('Gauntlet event not found');
  if (event.status !== 'active') throw new BadRequestError('Gauntlet is not active');

  await storage.updateGauntletEventStatus(id, 'completed');
  res.json({ status: 'completed' });
}));

// ─── Student: Join gauntlet + view status ──────────────────────────────────

gauntletRouter.post('/api/gauntlet/:id/join', requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid gauntlet ID');

  const event = await storage.getGauntletEventById(id);
  if (!event) throw new NotFoundError('Gauntlet event not found');
  if (event.status === 'completed') throw new BadRequestError('Gauntlet has ended');

  const { role } = req.body;
  if (!role || !['defender', 'attacker', 'observer'].includes(role)) {
    throw new BadRequestError('Valid role is required (defender, attacker, observer)');
  }

  // Check if already participating
  const existing = await storage.getGauntletParticipant(id, req.authContext!.userId);
  if (existing) {
    return res.json(existing);
  }

  const participant = await storage.addGauntletParticipant({
    gauntletId: id,
    userId: req.authContext!.userId,
    role,
  });

  res.status(201).json(participant);
}));

gauntletRouter.get('/api/gauntlet/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid gauntlet ID');

  const event = await storage.getGauntletEventById(id);
  if (!event) throw new NotFoundError('Gauntlet event not found');

  const participants = await storage.getGauntletParticipants(id);

  res.json({ ...event, participants });
}));

gauntletRouter.get('/api/gauntlet/:id/leaderboard', requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid gauntlet ID');

  const event = await storage.getGauntletEventById(id);
  if (!event) throw new NotFoundError('Gauntlet event not found');

  const participants = await storage.getGauntletParticipants(id);

  // Sort by score descending, group by role
  const defenders = participants
    .filter(p => p.role === 'defender')
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const attackers = participants
    .filter(p => p.role === 'attacker')
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  res.json({ defenders, attackers });
}));
