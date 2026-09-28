import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Require authenticated instructor for all studio routes
router.use(authenticate, requireRole('INSTRUCTOR'));

/**
 * Helper to compute duration in seconds
 */
function computeDurationSeconds(startedAt: Date | null, endedAt: Date | null, status: string): number | null {
  if (startedAt && endedAt) {
    return Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  }
  if (status === 'LIVE' && startedAt) {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  }
  return null;
}

/**
 * GET /api/studio/overview
 * Overview stats, active stream (if any) for live monitoring, and recent sessions.
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const instructorId = req.userId!;

    // Get all streams for this instructor's courses
    const streams = await prisma.stream.findMany({
      where: {
        course: {
          instructorId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        challengeSessions: {
          include: {
            submissions: {
              select: {
                id: true,
                testResults: true,
              },
            },
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    const totalStreams = streams.length;
    const totalViews = streams.reduce((sum: number, s) => sum + (s.peakViewers || 0), 0);
    const avgViewers = totalStreams > 0 ? Math.round(totalViews / totalStreams) : 0;

    // Total submissions across all challenge sessions in the instructor's streams
    let totalSubmissions = 0;
    for (const s of streams) {
      for (const cs of s.challengeSessions) {
        totalSubmissions += cs.submissions.length;
      }
    }

    // Active live stream (if instructor is currently live)
    const activeStreamRaw = streams.find((s) => s.status === 'LIVE');
    let activeStream: any = null;

    if (activeStreamRaw) {
      const viewerCountStr = await redis.hget(`session:${activeStreamRaw.id}`, 'viewer_count');
      const liveViewerCount = Math.max(0, parseInt(viewerCountStr || '0', 10));

      activeStream = {
        id: activeStreamRaw.id,
        title: activeStreamRaw.title,
        status: activeStreamRaw.status,
        startedAt: activeStreamRaw.startedAt,
        thumbnailUrl: activeStreamRaw.thumbnailUrl,
        course: activeStreamRaw.course,
        viewerCount: liveViewerCount,
        durationSeconds: computeDurationSeconds(activeStreamRaw.startedAt, null, 'LIVE'),
      };
    }

    // Recent 5 sessions
    const recentSessions = streams.slice(0, 5).map((s) => {
      const submissionCount = s.challengeSessions.reduce((acc: number, cs) => acc + cs.submissions.length, 0);
      return {
        id: s.id,
        title: s.title,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationSeconds: computeDurationSeconds(s.startedAt, s.endedAt, s.status),
        peakViewers: s.peakViewers,
        thumbnailUrl: s.thumbnailUrl,
        courseTitle: s.course.title,
        submissionCount,
      };
    });

    res.json({
      totalStreams,
      totalViews,
      avgViewers,
      totalSubmissions,
      activeStream,
      recentSessions,
    });
  } catch (err) {
    console.error('Studio overview error:', err);
    res.status(500).json({ error: 'Failed to load studio overview' });
  }
});

/**
 * GET /api/studio/streams
 * Paginated table of instructor's past and scheduled streams with analytics.
 */
router.get('/streams', async (req: Request, res: Response) => {
  try {
    const instructorId = req.userId!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const where = {
      course: {
        instructorId,
      },
    };

    const [total, streamRecords] = await Promise.all([
      prisma.stream.count({ where }),
      prisma.stream.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          startedAt: 'desc',
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          challengeSessions: {
            include: {
              submissions: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const streams = streamRecords.map((s) => {
      const submissionCount = s.challengeSessions.reduce((acc: number, cs) => acc + cs.submissions.length, 0);
      return {
        id: s.id,
        title: s.title,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationSeconds: computeDurationSeconds(s.startedAt, s.endedAt, s.status),
        peakViewers: s.peakViewers,
        thumbnailUrl: s.thumbnailUrl,
        course: s.course,
        challengeCount: s.challengeSessions.length,
        submissionCount,
      };
    });

    res.json({
      streams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Studio streams error:', err);
    res.status(500).json({ error: 'Failed to load studio streams' });
  }
});

/**
 * GET /api/studio/streams/:id
 * Single stream detailed analytics and per-challenge submission breakdown.
 */
router.get('/streams/:id', async (req: Request, res: Response) => {
  try {
    const streamId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const instructorId = req.userId!;

    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            instructorId: true,
          },
        },
        challengeSessions: {
          include: {
            challenge: {
              select: {
                id: true,
                title: true,
                description: true,
                language: true,
              },
            },
            submissions: {
              select: {
                id: true,
                status: true,
                testResults: true,
                executionTimeMs: true,
                submittedAt: true,
              },
            },
          },
          orderBy: {
            startedAt: 'asc',
          },
        },
      },
    });

    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    if (stream.course.instructorId !== instructorId) {
      res.status(403).json({ error: 'Access denied: You are not the instructor for this stream' });
      return;
    }

    let totalSubmissions = 0;
    let totalPassed = 0;

    const challenges = stream.challengeSessions.map((cs) => {
      const subs = cs.submissions;
      const submissionCount = subs.length;
      totalSubmissions += submissionCount;

      let passedCount = 0;
      let totalExecutionTime = 0;
      let timedCount = 0;

      for (const sub of subs) {
        const results = sub.testResults as any;
        if (results && typeof results.passed === 'number' && results.total > 0 && results.passed === results.total) {
          passedCount++;
        }
        if (sub.executionTimeMs != null) {
          totalExecutionTime += sub.executionTimeMs;
          timedCount++;
        }
      }

      totalPassed += passedCount;

      const solveRate = submissionCount > 0 ? Math.round((passedCount / submissionCount) * 100) : 0;
      const avgExecutionTimeMs = timedCount > 0 ? Math.round(totalExecutionTime / timedCount) : null;

      return {
        sessionId: cs.id,
        challengeId: cs.challenge.id,
        title: cs.challenge.title,
        description: cs.challenge.description,
        language: cs.challenge.language,
        startedAt: cs.startedAt,
        endedAt: cs.endedAt,
        status: cs.status,
        durationSeconds: cs.durationSeconds,
        submissionCount,
        passedCount,
        solveRate,
        avgExecutionTimeMs,
      };
    });

    const avgSolveRate = totalSubmissions > 0 ? Math.round((totalPassed / totalSubmissions) * 100) : 0;

    res.json({
      stream: {
        id: stream.id,
        title: stream.title,
        status: stream.status,
        startedAt: stream.startedAt,
        endedAt: stream.endedAt,
        durationSeconds: computeDurationSeconds(stream.startedAt, stream.endedAt, stream.status),
        peakViewers: stream.peakViewers,
        thumbnailUrl: stream.thumbnailUrl,
        streamKey: stream.streamKey,
        course: {
          id: stream.course.id,
          title: stream.course.title,
          slug: stream.course.slug,
        },
      },
      stats: {
        peakViewers: stream.peakViewers,
        totalSubmissions,
        challengesFired: stream.challengeSessions.length,
        avgSolveRate,
      },
      challenges,
    });
  } catch (err) {
    console.error('Studio stream detail error:', err);
    res.status(500).json({ error: 'Failed to load studio stream details' });
  }
});

export default router;
