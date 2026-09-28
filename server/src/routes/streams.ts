import express, { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { authenticate, requireRole, requireStreamOwner, requireInternalSecret } from '../middleware/auth';

const router = Router();

/**
 * GET /api/streams
 * List all streams (optionally filter by status).
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where = status ? { status: status.toUpperCase() as any } : undefined;

    // Offset pagination — bounded page size so the list can't grow unbounded.
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [streams, total] = await Promise.all([
      prisma.stream.findMany({
        where,
        include: {
          course: {
            select: {
              title: true,
              slug: true,
              instructor: { select: { id: true, displayName: true } },
            },
          },
          challengeSessions: {
            include: {
              challenge: { select: { id: true, title: true } },
            },
            orderBy: { startedAt: 'desc' },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stream.count({ where }),
    ]);

    // Enrich with live viewer counts from Redis
    const enriched = await Promise.all(
      streams.map(async (stream) => {
        const viewerCount = await redis.hget(`session:${stream.id}`, 'viewer_count');
        return {
          id: stream.id,
          title: stream.title,
          status: stream.status,
          hlsUrl: stream.hlsUrl,
          thumbnailUrl: stream.thumbnailUrl,
          startedAt: stream.startedAt,
          course: stream.course.title,
          courseSlug: stream.course.slug,
          instructor: stream.course.instructor.displayName,
          instructorId: stream.course.instructor.id,
          viewerCount: Math.max(0, parseInt(viewerCount || '0', 10)),
          challengeSessions: stream.challengeSessions,
        };
      })
    );

    // Backward-compatible: `streams` unchanged; `pagination` is additive.
    res.json({ streams: enriched, pagination: { page, limit, total } });
  } catch (err) {
    console.error('List streams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/streams/:id
 * Get stream details.
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const stream = await prisma.stream.findUnique({
      where: { id: req.params.id as string },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            instructor: { select: { id: true, displayName: true } },
            challenges: {
              select: { id: true, title: true, language: true },
            },
          },
        },
        challengeSessions: {
          include: {
            challenge: { select: { id: true, title: true } },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    const viewerCount = await redis.hget(`session:${stream.id}`, 'viewer_count');
    const isOwner = stream.course.instructor.id === req.userId;

    // Whitelist fields. streamKey is the RTMP publish credential — only the owner
    // may ever see it, otherwise any viewer could hijack the broadcast.
    res.json({
      stream: {
        id: stream.id,
        title: stream.title,
        status: stream.status,
        hlsUrl: stream.hlsUrl,
        vodUrl: stream.vodUrl,
        thumbnailUrl: stream.thumbnailUrl,
        startedAt: stream.startedAt,
        endedAt: stream.endedAt,
        course: stream.course,
        instructorId: stream.course.instructor.id,
        isOwner,
        challengeSessions: stream.challengeSessions,
        viewerCount: Math.max(0, parseInt(viewerCount || '0', 10)),
        ...(isOwner ? { streamKey: stream.streamKey } : {}),
      },
    });
  } catch (err) {
    console.error('Get stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/streams
 * Create a new stream (instructor only).
 */
router.post(
  '/',
  authenticate,
  requireRole('INSTRUCTOR'),
  async (req: Request, res: Response) => {
    try {
      const { title, courseId, thumbnailUrl } = req.body;

      if (!title || !courseId) {
        res.status(400).json({ error: 'title and courseId are required' });
        return;
      }

      // Verify course ownership
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.instructorId !== req.userId) {
        res.status(403).json({ error: 'Not the course owner' });
        return;
      }

      // Generate RTMP stream key (§10.4)
      const streamKey = crypto.randomBytes(32).toString('hex');

      const stream = await prisma.stream.create({
        data: {
          courseId,
          title,
          streamKey,
          status: 'SCHEDULED',
          thumbnailUrl: typeof thumbnailUrl === 'string' && thumbnailUrl ? thumbnailUrl : null,
        },
      });

      res.status(201).json({
        stream: {
          id: stream.id,
          title: stream.title,
          streamKey: stream.streamKey,
          status: stream.status,
          thumbnailUrl: stream.thumbnailUrl,
        },
      });
    } catch (err) {
      console.error('Create stream error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/streams/:streamId/go-live
 * Set stream to live status and populate HLS URL.
 */
router.patch(
  '/:streamId/go-live',
  authenticate,
  requireRole('INSTRUCTOR'),
  requireStreamOwner(),
  async (req: Request, res: Response) => {
    try {
      const streamId = req.params.streamId as string;
      const { hlsUrl } = req.body;

      // Enforce limit: Instructors may only have 1 LIVE stream at any given time.
      const existingLiveStream = await prisma.stream.findFirst({
        where: {
          status: 'LIVE',
          course: {
            instructorId: req.userId,
          },
          id: { not: streamId },
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (existingLiveStream) {
        res.status(409).json({
          error: `You already have an active live stream ("${existingLiveStream.title}"). Instructors may only have 1 live stream at a time. Please end your active stream before going live with another.`,
          activeStreamId: existingLiveStream.id,
        });
        return;
      }

      const stream = await prisma.stream.update({
        where: { id: streamId },
        data: {
          status: 'LIVE',
          hlsUrl: hlsUrl || null,
          startedAt: new Date(),
        },
      });

      // Initialize Redis session state
      await redis.hset(`session:${streamId}`, {
        status: 'live',
        hls_url: stream.hlsUrl || '',
        viewer_count: '0',
        instructor_id: req.userId!,
        seq: '0',
      });

      res.json({ stream: { id: stream.id, status: stream.status, hlsUrl: stream.hlsUrl } });
    } catch (err) {
      console.error('Go live error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/streams/:streamId/end
 * End a live stream.
 */
router.patch(
  '/:streamId/end',
  authenticate,
  requireRole('INSTRUCTOR'),
  requireStreamOwner(),
  async (req: Request, res: Response) => {
    try {
      const streamId = req.params.streamId as string;

      const stream = await prisma.stream.update({
        where: { id: streamId },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
        },
      });

      // Clean up Redis
      await redis.del(`session:${streamId}`);

      // Notify all viewers. Emit via publishStreamEvent (Redis emitter) — this
      // route runs in the API-server process, which has no Socket.IO instance;
      // getIO() only exists in the WS-server process. The Redis emitter delivers
      // cross-process to the stream room (same pattern the chat route uses).
      const { publishStreamEvent } = await import('../lib/socket');
      await publishStreamEvent(streamId, 'stream_end', {});

      res.json({ stream: { id: stream.id, status: stream.status } });
    } catch (err) {
      console.error('End stream error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/streams/:streamId/chat
 * Send a chat message.
 */
router.post(
  '/:streamId/chat',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const streamId = req.params.streamId as string;
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      
      const { publishStreamEvent } = await import('../lib/socket');
      await publishStreamEvent(streamId, 'chat_message', {
        userId: user?.id,
        user: user?.displayName || user?.email.split('@')[0] || 'Unknown',
        message: message.trim().substring(0, 500),
        isInstructor: user?.role === 'INSTRUCTOR',
      });

      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Chat message error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/streams/:streamId/reaction
 * Broadcast an ephemeral live reaction (e.g. ❤️, 🔥, 👏, 🚀).
 */
router.post(
  '/:streamId/reaction',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const streamId = req.params.streamId as string;
      const { emoji } = req.body;

      if (!emoji || typeof emoji !== 'string') {
        res.status(400).json({ error: 'emoji is required' });
        return;
      }

      const { getIO } = await import('../lib/socket');
      try {
        const io = getIO();
        io.to(`stream:${streamId}`).emit('stream_reaction', {
          id: `react_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          emoji: emoji.slice(0, 8),
          userId: req.userId,
          timestamp: Date.now(),
        });
      } catch (e) {
        // Socket server may not be initialized in certain testing environments
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Reaction error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/streams/rtmp/auth
 * nginx-rtmp `on_publish` callback. Fires BEFORE nginx accepts a broadcast.
 * nginx sends application/x-www-form-urlencoded with `name` = the stream key.
 * Respond 2xx to allow publishing, non-2xx to reject.
 *
 * No JWT here — a broadcast has no user session. The unguessable per-stream
 * `streamKey` is the credential; we just verify it maps to a real, non-ended stream.
 */
router.post(
  '/rtmp/auth',
  express.urlencoded({ extended: false }),
  async (req: Request, res: Response) => {
    try {
      const streamKey = req.body?.name;
      if (!streamKey || typeof streamKey !== 'string') {
        res.status(403).send('Missing stream key');
        return;
      }

      const stream = await prisma.stream.findUnique({
        where: { streamKey },
        select: {
          id: true,
          status: true,
          course: {
            select: { instructorId: true },
          },
        },
      });

      if (!stream || stream.status === 'ENDED') {
        res.status(403).send('Invalid or ended stream key');
        return;
      }

      // Enforce 1 live stream limit: check if the instructor is already broadcasting another live stream
      const otherLiveStream = await prisma.stream.findFirst({
        where: {
          status: 'LIVE',
          course: {
            instructorId: stream.course.instructorId,
          },
          id: { not: stream.id },
        },
        select: { id: true },
      });

      if (otherLiveStream) {
        console.warn(`[RTMP] Rejected stream broadcast: instructor ${stream.course.instructorId} already has active live stream ${otherLiveStream.id}`);
        res.status(409).send('Instructor already has an active live stream');
        return;
      }

      res.status(200).send('OK');
    } catch (err) {
      console.error('RTMP auth error:', err);
      res.status(403).send('Auth error');
    }
  }
);

/**
 * POST /api/streams/rtmp/done
 * nginx-rtmp `on_publish_done` callback. Fires when the broadcaster disconnects
 * (e.g. OBS stops streaming). If the stream hasn't been ended by the instructor yet,
 * this auto-ends it and notifies all viewers.
 */
router.post(
  '/rtmp/done',
  express.urlencoded({ extended: false }),
  async (req: Request, res: Response) => {
    try {
      const streamKey = req.body?.name;
      if (!streamKey || typeof streamKey !== 'string') {
        res.status(200).send('OK');
        return;
      }

      const stream = await prisma.stream.findUnique({
        where: { streamKey },
        select: { id: true, status: true },
      });

      if (!stream) {
        res.status(200).send('OK');
        return;
      }

      // Only auto-end if still LIVE (instructor may have already ended it)
      if (stream.status === 'LIVE') {
        await prisma.stream.update({
          where: { id: stream.id },
          data: { status: 'ENDED', endedAt: new Date() },
        });

        // Clean up Redis
        await redis.del(`session:${stream.id}`);

        // Notify viewers
        const { publishStreamEvent } = await import('../lib/socket');
        await publishStreamEvent(stream.id, 'stream_end', {});

        console.log(`[RTMP] Auto-ended stream ${stream.id} (OBS disconnected)`);
      }

      res.status(200).send('OK');
    } catch (err) {
      console.error('RTMP done callback error:', err);
      res.status(200).send('OK'); // Always return 200 to nginx
    }
  }
);

/**
 * PATCH /api/streams/by-key/:streamKey/vod-ready
 * Update a stream with its recorded VOD URL (called by media server/S3 uploader).
 */
router.patch(
  '/by-key/:streamKey/vod-ready',
  requireInternalSecret,
  async (req: Request, res: Response) => {
    try {
      const streamKey = req.params.streamKey as string;
      const { vodUrl } = req.body;

      if (!vodUrl || typeof vodUrl !== 'string') {
        res.status(400).json({ error: 'vodUrl is required' });
        return;
      }

      await prisma.stream.update({
        where: { streamKey },
        data: { vodUrl },
      });

      // Don't echo the stream row back to an internal caller.
      res.json({ success: true });
    } catch (err) {
      console.error('VOD ready error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/streams/:streamId/events
 * Fetch historical events for VOD playback.
 */
router.get(
  '/:streamId/events',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const streamId = req.params.streamId as string;

      // Offset pagination — VOD event logs grow over a stream's lifetime.
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 200));

      const [events, total] = await Promise.all([
        prisma.streamEvent.findMany({
          where: { streamId },
          orderBy: { seq: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.streamEvent.count({ where: { streamId } }),
      ]);

      // Map to expected format
      const formatted = events.map(e => ({
        type: e.type,
        seq: e.seq,
        streamId: e.streamId,
        payload: e.payload,
        serverTime: e.serverTime.getTime(),
      }));

      res.json({ events: formatted, pagination: { page, limit, total } });
    } catch (err) {
      console.error('Get stream events error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
