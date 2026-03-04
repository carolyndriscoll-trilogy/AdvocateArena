import { db } from '../db';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { userStats, pointTransactions, seasons } from '@shared/schema';

/**
 * Standard Elo calculation with K-factor based on games played.
 * Maps difficulty to an "opponent rating":
 *   curious_skeptic: 1100, domain_expert: 1400, sources_weaponized: 1600
 */
const DIFFICULTY_RATINGS: Record<string, number> = {
  curious_skeptic: 1100,
  domain_expert: 1400,
  sources_weaponized: 1600,
};

function getKFactor(gamesPlayed: number): number {
  if (gamesPlayed < 10) return 40;  // New players: volatile
  if (gamesPlayed < 30) return 24;  // Settling in
  return 16;                         // Established
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateEloChange(
  studentRating: number,
  difficulty: string,
  score: number,
  maxScore: number,
  gamesPlayed: number,
): number {
  const opponentRating = DIFFICULTY_RATINGS[difficulty] || 1200;
  const K = getKFactor(gamesPlayed);
  // Normalize score to 0-1 range for Elo
  const actualScore = score / maxScore;
  const expected = expectedScore(studentRating, opponentRating);
  return Math.round(K * (actualScore - expected));
}

/**
 * Get or create user stats for the current season (or global if no season).
 */
export async function getOrCreateUserStats(userId: string) {
  // Find active season
  const activeSeason = await db.query.seasons?.findFirst({
    where: eq(seasons.isActive, true),
  });

  const seasonId = activeSeason?.id || null;

  // Try to find existing stats
  const existing = await db.query.userStats?.findFirst({
    where: seasonId
      ? and(eq(userStats.userId, userId), eq(userStats.seasonId, seasonId))
      : and(eq(userStats.userId, userId), isNull(userStats.seasonId)),
  });

  if (existing) return existing;

  // Create new stats
  const [stats] = await db.insert(userStats)
    .values({ userId, seasonId })
    .returning();
  return stats;
}

/**
 * Award points for various actions.
 */
export async function awardPoints(
  userId: string,
  amount: number,
  reason: string,
  defenseId?: number,
) {
  // Record transaction
  await db.insert(pointTransactions).values({
    userId,
    amount,
    reason,
    defenseId: defenseId || null,
  });

  // Update total
  const stats = await getOrCreateUserStats(userId);
  await db.update(userStats)
    .set({ totalPoints: stats.totalPoints + amount })
    .where(eq(userStats.id, stats.id));
}

/**
 * Update Elo after a debate. Called from evaluation job.
 */
export async function updateEloAfterDebate(
  userId: string,
  difficulty: string,
  score: number,
  maxScore: number,
  defenseId: number,
  passed: boolean,
) {
  const stats = await getOrCreateUserStats(userId);
  const gamesPlayed = stats.wins + stats.losses;

  const eloChange = calculateEloChange(stats.eloRating, difficulty, score, maxScore, gamesPlayed);
  const newElo = Math.max(100, stats.eloRating + eloChange); // Floor at 100

  await db.update(userStats)
    .set({
      eloRating: newElo,
      wins: passed ? stats.wins + 1 : stats.wins,
      losses: passed ? stats.losses : stats.losses + 1,
      streak: passed ? stats.streak + 1 : 0,
    })
    .where(eq(userStats.id, stats.id));

  // Award points
  await awardPoints(userId, 50, 'debate_completion', defenseId);

  // High score bonuses (25 pts per axis scoring 3+)
  const axisBonus = Math.floor(score / 4); // Rough estimate: each axis at 3+ = 1 bonus unit
  if (axisBonus > 0) {
    await awardPoints(userId, axisBonus * 25, 'high_axis_scores', defenseId);
  }

  // Streak bonus
  if (passed && stats.streak >= 2) {
    await awardPoints(userId, 15 * stats.streak, 'win_streak', defenseId);
  }

  return { oldElo: stats.eloRating, newElo, eloChange };
}

/**
 * Get leaderboard (top N users by Elo).
 */
export async function getLeaderboard(limit: number = 50) {
  return db.select({
    userId: userStats.userId,
    eloRating: userStats.eloRating,
    totalPoints: userStats.totalPoints,
    wins: userStats.wins,
    losses: userStats.losses,
    streak: userStats.streak,
  })
    .from(userStats)
    .orderBy(desc(userStats.eloRating))
    .limit(limit);
}

/**
 * Get a specific user's stats + rank.
 */
export async function getUserStatsWithRank(userId: string) {
  const stats = await getOrCreateUserStats(userId);
  // Count users with higher Elo
  const allStats = await db.select({ eloRating: userStats.eloRating })
    .from(userStats)
    .orderBy(desc(userStats.eloRating));
  const rank = allStats.findIndex(s => s.eloRating <= stats.eloRating) + 1;

  return { ...stats, rank, totalPlayers: allStats.length };
}
