import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/leaderboard/global
 * Community-wide ranking aggregated over submissions in CLOSED challenge
 * sessions. Simple, explainable scoring:
 *   - points              = Σ (per-submission score) across all closed sessions
 *   - challengesCompleted = # submissions that scored 100%
 *   - tiebreak            = fastest total execution time
 * Returns the top 50 plus the caller's own ranked row (so a viewer always sees
 * "You: #N" even when outside the top list). Read-only — safe for viewers.
 */
router.get('/global', authenticate, async (req: Request, res: Response) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: {
        status: { in: ['EXECUTED', 'AI_EVALUATED', 'ERROR'] },
        challengeSession: { status: 'CLOSED' },
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    type Agg = {
      userId: string;
      user: string;
      points: number;
      challengesCompleted: number;
      attempts: number;
      totalMs: number;
    };

    const byUser = new Map<string, Agg>();
    for (const s of submissions) {
      const r = s.testResults as { passed?: number; total?: number } | null;
      const passed = r?.passed ?? 0;
      const total = r?.total ?? 0;
      const score = total > 0 ? Math.round((passed / total) * 100) : 0;

      const cur =
        byUser.get(s.userId) ??
        {
          userId: s.userId,
          user: s.user.displayName || s.user.email.split('@')[0],
          points: 0,
          challengesCompleted: 0,
          attempts: 0,
          totalMs: 0,
        };
      cur.points += score;
      cur.attempts += 1;
      if (score === 100) cur.challengesCompleted += 1;
      cur.totalMs += s.executionTimeMs ?? 0;
      byUser.set(s.userId, cur);
    }

    const ranked = [...byUser.values()]
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.challengesCompleted - a.challengesCompleted ||
          a.totalMs - b.totalMs
      )
      .map((u, i) => ({
        rank: i + 1,
        userId: u.userId,
        user: u.user,
        points: u.points,
        challengesCompleted: u.challengesCompleted,
        attempts: u.attempts,
        isMe: u.userId === req.userId,
      }));

    const me = ranked.find((r) => r.isMe) ?? null;

    res.json({
      leaderboard: ranked.slice(0, 50),
      me,
      totalRanked: ranked.length,
    });
  } catch (err) {
    console.error('Global leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
