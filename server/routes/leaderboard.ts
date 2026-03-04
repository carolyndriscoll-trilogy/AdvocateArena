import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, BadRequestError } from '../middleware/error-handler';
import { getLeaderboard, getUserStatsWithRank } from '../services/elo';

export const leaderboardRouter = Router();

// Get leaderboard
leaderboardRouter.get('/api/leaderboard', requireAuth, asyncHandler(async (_req, res) => {
  const leaderboard = await getLeaderboard(50);
  res.json(leaderboard);
}));

// Get current user's stats + rank
leaderboardRouter.get('/api/leaderboard/me', requireAuth, asyncHandler(async (req, res) => {
  const stats = await getUserStatsWithRank(req.authContext!.userId);
  res.json(stats);
}));
