import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler';
import { storage } from '../storage';

export const adminRouter = Router();

// Admin check middleware
function requireAdmin(req: any, _res: any, next: any) {
  if (req.authContext?.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
  next();
}

adminRouter.use('/api/admin', requireAuth, requireAdmin);

// ─── Norming Library ───────────────────────────────────────────────────────

adminRouter.post('/api/admin/norming', asyncHandler(async (req, res) => {
  const { axis, performanceLevel, transcriptExcerpt, annotatorNotes, score } = req.body;

  if (!axis) throw new BadRequestError('Axis is required');
  if (!performanceLevel) throw new BadRequestError('Performance level is required');
  if (!['exemplary', 'proficient', 'developing', 'beginning'].includes(performanceLevel)) {
    throw new BadRequestError('Invalid performance level');
  }
  if (!transcriptExcerpt) throw new BadRequestError('Transcript excerpt is required');
  if (score === undefined || score === null) throw new BadRequestError('Score is required');

  const exemplar = await storage.createNormingExemplar({
    axis,
    performanceLevel,
    transcriptExcerpt,
    annotatorNotes: annotatorNotes || undefined,
    score,
  });

  res.status(201).json(exemplar);
}));

adminRouter.get('/api/admin/norming', asyncHandler(async (req, res) => {
  const { axis, performanceLevel } = req.query;
  const exemplars = await storage.getNormingExemplars({
    axis: axis as string | undefined,
    performanceLevel: performanceLevel as string | undefined,
  });
  res.json(exemplars);
}));

adminRouter.get('/api/admin/norming/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid exemplar ID');

  const exemplar = await storage.getNormingExemplarById(id);
  if (!exemplar) throw new NotFoundError('Exemplar not found');

  res.json(exemplar);
}));

adminRouter.delete('/api/admin/norming/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid exemplar ID');

  const exemplar = await storage.getNormingExemplarById(id);
  if (!exemplar) throw new NotFoundError('Exemplar not found');

  await storage.deleteNormingExemplar(id);
  res.json({ status: 'deleted' });
}));

// ─── Norming: Public read access for guides ────────────────────────────────
// (Separate from admin prefix so guides can view exemplars)

export const normingReadRouter = Router();

normingReadRouter.get('/api/norming', requireAuth, asyncHandler(async (req, res) => {
  const { axis, performanceLevel } = req.query;
  const exemplars = await storage.getNormingExemplars({
    axis: axis as string | undefined,
    performanceLevel: performanceLevel as string | undefined,
  });
  res.json(exemplars);
}));
