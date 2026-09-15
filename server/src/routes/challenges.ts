import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { authenticate, requireRole, requireStreamOwner } from '../middleware/auth';
import { challengeTriggerRateLimit } from '../middleware/rateLimit';
import { publishStreamEvent } from '../lib/socket';

const router = Router();

/**
 * GET /api/challenges
 * List challenges for a course.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : undefined;

    const challenges = await prisma.challenge.findMany({
      where: courseId ? { courseId } : undefined,
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        courseId: true,
        config: true,
        staticHints: true,
        createdAt: true,
        course: { select: { instructorId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Never expose test-case inputs/expected outputs to non-owners — that leaks
    // the answers. Owners get the full config (needed for editing).
    const sanitized = challenges.map((c) => {
      const isOwner = c.course.instructorId === req.userId;
      const cfg = (c.config ?? {}) as {
        test_cases?: Array<{ input?: string; expected_output?: string; description?: string }>;
        time_limit_ms?: number;
        memory_limit_mb?: number;
      };

      const safeConfig = isOwner
        ? cfg
        : {
            // Keep only non-sensitive metadata the UI needs (count, limits, descriptions).
            test_cases: Array.isArray(cfg.test_cases)
              ? cfg.test_cases.map((tc) => ({ description: tc.description }))
              : [],
            time_limit_ms: cfg.time_limit_ms,
            memory_limit_mb: cfg.memory_limit_mb,
          };

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        language: c.language,
        courseId: c.courseId,
        config: safeConfig,
        staticHints: Array.isArray(c.staticHints) ? c.staticHints : [],
        createdAt: c.createdAt,
      };
    });

    res.json({ challenges: sanitized });
  } catch (err) {
    console.error('List challenges error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/challenges
 * Create a new challenge (instructor only).
 */
router.post(
  '/',
  authenticate,
  requireRole('INSTRUCTOR'),
  async (req: Request, res: Response) => {
    try {
      const { courseId, title, description, language, starterCode, config: challengeConfig, staticHints } = req.body;

      if (!courseId || !title || !description || !language || !challengeConfig) {
        res.status(400).json({ error: 'courseId, title, description, language, and config are required' });
        return;
      }

      // Verify course ownership
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.instructorId !== req.userId) {
        res.status(403).json({ error: 'Not the course owner' });
        return;
      }

      const challenge = await prisma.challenge.create({
        data: {
          courseId,
          title,
          description,
          language,
          starterCode: starterCode || null,
          config: challengeConfig,
          staticHints: staticHints || null,
        },
      });

      res.status(201).json({ challenge });
    } catch (err) {
      console.error('Create challenge error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/streams/:streamId/challenges/trigger
 * Trigger a challenge in a live stream.
 * Creates a challenge_session and broadcasts challenge_start to all viewers.
 * Implements Sequence Diagram 1 (§11).
 */
router.post(
  '/:streamId/trigger',
  authenticate,
  requireRole('INSTRUCTOR'),
  requireStreamOwner(),
  challengeTriggerRateLimit,
  async (req: Request, res: Response) => {
    try {
      const streamId = req.params.streamId as string;
      const { challengeId, durationSeconds = 120 } = req.body;

      if (!challengeId) {
        res.status(400).json({ error: 'challengeId is required' });
        return;
      }

      // Verify stream is live
      const stream = await prisma.stream.findUnique({ where: { id: streamId } });
      if (!stream || stream.status !== 'LIVE') {
        res.status(400).json({ error: 'Stream is not live' });
        return;
      }

      // Verify challenge exists
      const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      if (!challenge) {
        res.status(404).json({ error: 'Challenge not found' });
        return;
      }

      // Close any existing active challenge session
      await prisma.challengeSession.updateMany({
        where: { streamId, status: 'ACTIVE' },
        data: { status: 'CLOSED', endedAt: new Date() },
      });

      // Create new challenge session
      const session = await prisma.challengeSession.create({
        data: {
          streamId,
          challengeId,
          durationSeconds,
          status: 'ACTIVE',
        },
      });

      // Update Redis session state
      await redis.hset(`session:${streamId}`, {
        current_challenge_session_id: session.id,
        challenge_started_at: session.startedAt.getTime().toString(),
      });

      // Publish challenge_start event to all viewers
      const seq = await publishStreamEvent(streamId, 'challenge_start', {
        sessionId: session.id,
        challenge: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          starterCode: challenge.starterCode,
          language: challenge.language,
        },
        durationSeconds,
        startedAt: session.startedAt.getTime(),
      });

      console.log(`🎯 Challenge triggered: "${challenge.title}" in stream ${streamId.substring(0, 8)} (seq: ${seq})`);

      res.json({
        sessionId: session.id,
        startedAt: session.startedAt.getTime(),
        seq,
      });
    } catch (err) {
      console.error('Trigger challenge error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/streams/:streamId/challenges/end
 * Close the active challenge in a stream.
 */
router.post(
  '/:streamId/end',
  authenticate,
  requireRole('INSTRUCTOR'),
  requireStreamOwner(),
  async (req: Request, res: Response) => {
    try {
      const streamId = req.params.streamId as string;

      // Find active challenge session
      const activeSession = await prisma.challengeSession.findFirst({
        where: { streamId, status: 'ACTIVE' },
      });

      if (!activeSession) {
        res.status(404).json({ error: 'No active challenge in this stream' });
        return;
      }

      // Close it
      await prisma.challengeSession.update({
        where: { id: activeSession.id },
        data: { status: 'CLOSED', endedAt: new Date() },
      });

      // Clear Redis state
      await redis.hdel(`session:${streamId}`, 'current_challenge_session_id', 'challenge_started_at');

      // Publish challenge_end to all viewers
      await publishStreamEvent(streamId, 'challenge_end', {
        sessionId: activeSession.id,
      });

      console.log(`🏁 Challenge ended in stream ${streamId.substring(0, 8)}`);

      res.json({ sessionId: activeSession.id, status: 'closed' });
    } catch (err) {
      console.error('End challenge error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/streams/:streamId/challenges/reveal-solution
 * Reveal solution code to all viewers.
 */
router.post(
  '/:streamId/reveal-solution',
  authenticate,
  requireRole('INSTRUCTOR'),
  requireStreamOwner(),
  async (req: Request, res: Response) => {
    try {
      const streamId = req.params.streamId as string;
      const { code } = req.body;

      if (typeof code !== 'string') {
        res.status(400).json({ error: 'Solution code must be a string' });
        return;
      }

      // Persist in Redis for snapshots
      await redis.hset(`session:${streamId}`, 'solution_code', code);

      // Publish solution_reveal to all viewers
      await publishStreamEvent(streamId, 'solution_reveal', {
        code,
      });

      console.log(`💡 Solution revealed in stream ${streamId.substring(0, 8)}`);

      res.json({ status: 'revealed' });
    } catch (err) {
      console.error('Reveal solution error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
