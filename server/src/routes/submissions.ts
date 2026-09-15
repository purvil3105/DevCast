import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { submissionRateLimit, runRateLimit } from '../middleware/rateLimit';
import { executeSandbox } from '../services/sandbox';
import { enqueueAIEvaluation } from '../services/ai-worker';

const router = Router();

// ─── Shared: run code through sandbox ────────────────────────────────────────
async function runCodeAgainstTests(
  code: string,
  language: string,
  challengeConfig: {
    test_cases: Array<{ input: string; expected_output: string; description?: string }>;
    time_limit_ms?: number;
    memory_limit_mb?: number;
  }
): Promise<{ testResults: any; executionTimeMs: number | null; status: 'EXECUTED' | 'ERROR' }> {
  let testResults: any = null;
  let executionTimeMs: number | null = null;
  let status: 'EXECUTED' | 'ERROR' = 'EXECUTED';

  try {
    const sandboxResult = await executeSandbox({
      code,
      language,
      testCases: challengeConfig.test_cases,
      timeLimitMs: challengeConfig.time_limit_ms || 5000,
      memoryLimitMb: challengeConfig.memory_limit_mb || 128,
    });

    testResults = {
      passed: sandboxResult.results.filter((r: any) => r.passed).length,
      total: sandboxResult.results.length,
      cases: sandboxResult.results,
    };
    executionTimeMs = sandboxResult.executionTimeMs;
  } catch (sandboxErr) {
    console.error('Sandbox execution failed:', sandboxErr);
    testResults = {
      passed: 0,
      total: challengeConfig.test_cases.length,
      cases: [],
      error: (sandboxErr as Error).message,
    };
    status = 'ERROR';
  }

  return { testResults, executionTimeMs, status };
}

/**
 * POST /api/submissions/run
 * Run code against test cases WITHOUT saving a submission.
 * Allows viewers to test their code before committing a final submission.
 */
router.post('/run', authenticate, runRateLimit, async (req: Request, res: Response) => {
  try {
    const { code, language, challengeSessionId } = req.body;

    if (!code || !language || !challengeSessionId) {
      res.status(400).json({ error: 'code, language, and challengeSessionId are required' });
      return;
    }

    const session = await prisma.challengeSession.findUnique({
      where: { id: challengeSessionId },
      include: { challenge: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Challenge session not found' });
      return;
    }

    if (session.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Challenge is no longer active' });
      return;
    }

    const challengeConfig = session.challenge.config as {
      test_cases: Array<{ input: string; expected_output: string; description?: string }>;
      time_limit_ms?: number;
      memory_limit_mb?: number;
    };

    console.log(`▶️  Run (no save): user=${req.userId!.substring(0, 8)} challenge="${session.challenge.title}"`);

    const { testResults, executionTimeMs } = await runCodeAgainstTests(code, language, challengeConfig);

    // Return results without saving — client shows them but can still re-submit
    res.status(200).json({ testResults, executionTimeMs, saved: false });
  } catch (err) {
    console.error('Run error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/submissions
 * Submit code as a FINAL submission (upsert — replaces previous if still ACTIVE).
 * Only one final submission is kept per user per challenge session.
 */
router.post(
  '/',
  authenticate,
  submissionRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { code, language, challengeSessionId } = req.body;

      if (!code || !language || !challengeSessionId) {
        res.status(400).json({ error: 'code, language, and challengeSessionId are required' });
        return;
      }

      // Verify challenge session is still active
      const session = await prisma.challengeSession.findUnique({
        where: { id: challengeSessionId },
        include: {
          challenge: true,
          stream: { select: { id: true } },
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Challenge session not found' });
        return;
      }

      if (session.status !== 'ACTIVE') {
        res.status(400).json({ error: 'Challenge is no longer active — submissions are closed.' });
        return;
      }

      const challengeConfig = session.challenge.config as {
        test_cases: Array<{ input: string; expected_output: string; description?: string }>;
        time_limit_ms?: number;
        memory_limit_mb?: number;
      };

      // Run sandbox
      const { testResults, executionTimeMs, status: submissionStatus } =
        await runCodeAgainstTests(code, language, challengeConfig);

      // Upsert — replace any previous submission for this user+session
      const submission = await prisma.submission.upsert({
        where: {
          challengeSessionId_userId: {
            challengeSessionId,
            userId: req.userId!,
          },
        },
        create: {
          challengeSessionId,
          userId: req.userId!,
          code,
          language,
          status: submissionStatus,
          testResults,
          executionTimeMs,
        },
        update: {
          code,
          language,
          status: submissionStatus,
          testResults,
          executionTimeMs,
          aiHint: null,      // reset AI hint for re-evaluation
          aiScore: null,     // reset score
        },
      });

      // Enqueue AI evaluation (async — don't await)
      enqueueAIEvaluation({
        submissionId: submission.id,
        userId: req.userId!,
        streamId: session.stream.id,
        challengeSessionId,
        code,
        language,
        challenge: {
          description: session.challenge.description,
          testCases: challengeConfig.test_cases,
          staticHints: session.challenge.staticHints as string[] | null,
        },
        testResults,
      }).catch((err) => {
        console.error('Failed to enqueue AI evaluation:', err);
      });

      console.log(
        `📝 Submit: user=${req.userId!.substring(0, 8)} challenge="${session.challenge.title}" ` +
        `results=${testResults.passed}/${testResults.total} time=${executionTimeMs}ms`
      );

      res.status(202).json({
        submissionId: submission.id,
        testResults,
        executionTimeMs,
        status: 'evaluating',
      });
    } catch (err) {
      console.error('Submit error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/submissions/leaderboard/:challengeSessionId
 * Returns the leaderboard.
 * - While challenge is ACTIVE: returns status='in_progress' with no entries
 * - After challenge ends: returns ranked final submissions
 */
router.get('/leaderboard/:challengeSessionId', authenticate, async (req: Request, res: Response) => {
  try {
    const challengeSessionId = req.params.challengeSessionId as string;

    // Check if challenge is still active
    const session = await prisma.challengeSession.findUnique({
      where: { id: challengeSessionId },
      select: { status: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Challenge session not found' });
      return;
    }

    // While active → return "in progress" status; no results yet
    if (session.status === 'ACTIVE') {
      res.json({ leaderboard: [], status: 'in_progress' });
      return;
    }

    // Challenge ended → build final leaderboard from last submission per user
    const submissions = await prisma.submission.findMany({
      where: {
        challengeSessionId,
        status: { in: ['EXECUTED', 'AI_EVALUATED', 'ERROR'] },
      },
      include: {
        user: { select: { displayName: true, email: true } },
      },
    });

    // Compute score per submission and rank
    const scored = submissions.map((sub) => {
      const results = sub.testResults as { passed?: number; total?: number } | null;
      const passed = results?.passed ?? 0;
      const total = results?.total ?? 1;
      const passRate = total > 0 ? passed / total : 0;
      const score = Math.round(passRate * 100);

      return {
        sub,
        score,
        passed,
        total: results?.total ?? 0,
        execMs: sub.executionTimeMs ?? Number.MAX_SAFE_INTEGER,
      };
    });

    // Sort: highest score first, then fastest
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.execMs - b.execMs;
    });

    const leaderboard = scored.map(({ sub, score, passed, total, execMs }, index) => ({
      rank: index + 1,
      user: (sub as any).user.displayName || (sub as any).user.email.split('@')[0],
      time: execMs < Number.MAX_SAFE_INTEGER ? `${(execMs / 1000).toFixed(2)}s` : 'N/A',
      score,
      passed,
      total,
      isMe: sub.userId === req.userId,
    }));

    res.json({ leaderboard, status: 'completed' });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/my
 * The caller's own submission history + aggregate progress summary.
 * Powers the viewer dashboard, challenge completion status, and achievements.
 * Declared BEFORE `/:id` so "my" isn't captured as an id param.
 */
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: req.userId! },
      include: {
        challengeSession: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            challenge: { select: { id: true, title: true, language: true } },
            stream: { select: { id: true, title: true, status: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const items = submissions.map((s) => {
      const r = s.testResults as { passed?: number; total?: number } | null;
      const passed = r?.passed ?? 0;
      const total = r?.total ?? 0;
      const score = total > 0 ? Math.round((passed / total) * 100) : 0;
      return {
        id: s.id,
        submittedAt: s.submittedAt,
        language: s.language,
        status: s.status,
        executionTimeMs: s.executionTimeMs,
        aiScore: s.aiScore,
        passed,
        total,
        score,
        challenge: s.challengeSession.challenge, // { id, title, language }
        stream: s.challengeSession.stream,        // { id, title, status }
        sessionId: s.challengeSession.id,
        sessionStatus: s.challengeSession.status,
      };
    });

    // Aggregate summary (best score per challenge drives "completed")
    const bestByChallenge = new Map<string, number>();
    for (const i of items) {
      bestByChallenge.set(i.challenge.id, Math.max(bestByChallenge.get(i.challenge.id) ?? 0, i.score));
    }
    const scores = items.map((i) => i.score);
    const totalPassed = items.reduce((a, i) => a + i.passed, 0);
    const totalTests = items.reduce((a, i) => a + i.total, 0);
    const execTimes = items.map((i) => i.executionTimeMs).filter((n): n is number => n != null);

    const summary = {
      totalAttempts: items.length,
      distinctChallenges: bestByChallenge.size,
      challengesCompleted: [...bestByChallenge.values()].filter((s) => s === 100).length,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      bestScore: scores.length ? Math.max(...scores) : 0,
      passRate: totalTests ? Math.round((totalPassed / totalTests) * 100) : 0,
      perfectCount: items.filter((i) => i.score === 100).length,
      languages: [...new Set(items.map((i) => i.language))],
      fastestMs: execTimes.length ? Math.min(...execTimes) : null,
    };

    res.json({ submissions: items, summary });
  } catch (err) {
    console.error('My submissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/:id
 * Get a specific submission's status and results.
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id as string },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (submission.userId !== req.userId) {
      res.status(403).json({ error: 'Not your submission' });
      return;
    }

    res.json({ submission });
  } catch (err) {
    console.error('Get submission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
