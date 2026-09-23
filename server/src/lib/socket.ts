import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { Emitter } from '@socket.io/redis-emitter';
import { config } from '../config';
import { redis, redisPub, redisSub } from './redis';
import { prisma } from './prisma';

let io: Server;
let emitter: Emitter;

/**
 * ServerEvent envelope — all server→client messages follow this shape.
 * Matches system design §6.2 exactly.
 */
export interface ServerEvent {
  type: string;
  seq: number;
  streamId: string;
  payload: unknown;
  serverTime: number;
}

/**
 * Initialize Socket.IO server with Redis adapter.
 */
export function initSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling (Phase 2, but wired now)
  io.adapter(createAdapter(redisPub, redisSub));

  // ─── Authentication Middleware ──────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as {
        userId: string;
        role: string;
      };
      (socket as any).userId = decoded.userId;
      (socket as any).role = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ────────────────────────────────
  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const streamId = socket.handshake.query.streamId as string;

    if (!streamId) {
      socket.disconnect(true);
      return;
    }

    console.log(`🔌 WS connected: user=${userId.substring(0, 8)} stream=${streamId.substring(0, 8)}`);

    // Join the stream room
    socket.join(`stream:${streamId}`);
    // Join a private room for this user so we can deliver 1:1 events (e.g. AI hints).
    socket.join(`user:${userId}`);

    // Increment viewer count
    await redis.hincrby(`session:${streamId}`, 'viewer_count', 1);

    // Send session snapshot (§6.3 — New Connection)
    await sendSessionSnapshot(socket, streamId, userId);
    await sendEventReplay(socket, streamId);

    // Broadcast updated viewer count
    const viewerCount = await redis.hget(`session:${streamId}`, 'viewer_count');
    io.to(`stream:${streamId}`).emit('viewer_count_update', {
      type: 'viewer_count_update',
      streamId,
      payload: { count: parseInt(viewerCount || '0', 10) },
      serverTime: Date.now(),
    });

    // ─── Client Messages ──────────────────────────────────
    socket.on('reconnect_request', async (data: { lastSeq?: number }) => {
      // MVP: always send full snapshot (no event replay)
      await sendSessionSnapshot(socket, streamId, userId);
      await sendEventReplay(socket, streamId);
    });

    socket.on('ping_client', () => {
      socket.emit('pong_server', { serverTime: Date.now() });
    });

    // ─── Disconnect ───────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 WS disconnected: user=${userId.substring(0, 8)}`);
      // Decrement, but never let the stored count drop below zero — a disconnect
      // can arrive without a matching connect (e.g. after a server restart), which
      // would otherwise leave the counter negative for the life of the session.
      const next = await redis.hincrby(`session:${streamId}`, 'viewer_count', -1);
      if (next < 0) await redis.hset(`session:${streamId}`, 'viewer_count', '0');

      io.to(`stream:${streamId}`).emit('viewer_count_update', {
        type: 'viewer_count_update',
        streamId,
        payload: { count: Math.max(0, next) },
        serverTime: Date.now(),
      });
    });
  });

  // ─── State Reconciliation ────────────────────────────────
  // Periodically true-up the Redis viewer count with the actual socket count
  // to heal ghost connections from server crashes.
  setInterval(async () => {
    try {
      const activeStreams = await prisma.stream.findMany({ 
        where: { status: 'LIVE' }, 
        select: { id: true } 
      });
      for (const stream of activeStreams) {
        const streamRoom = `stream:${stream.id}`;
        const sockets = await io.in(streamRoom).fetchSockets();
        const actualCount = sockets.length;
        await redis.hset(`session:${stream.id}`, 'viewer_count', actualCount.toString());
        
        io.to(streamRoom).emit('viewer_count_update', {
          type: 'viewer_count_update',
          streamId: stream.id,
          payload: { count: actualCount },
          serverTime: Date.now(),
        });
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
    }
  }, 30000);

  return io;
}

/**
 * Send full session snapshot to a socket.
 * Used on initial connect and reconnection (MVP — no event replay).
 */
async function sendSessionSnapshot(socket: Socket, streamId: string, userId: string) {
  // Get session state from Redis
  const session = await redis.hgetall(`session:${streamId}`);

  // Get stream info from DB if Redis is empty
  let hlsUrl = session.hls_url || null;
  let streamStatus = session.status || 'scheduled';

  try {
    if (!session.status) {
      const stream = await prisma.stream.findUnique({ where: { id: streamId } });
      if (stream) {
        hlsUrl = stream.hlsUrl;
        streamStatus = stream.status.toLowerCase();
      }
    }
  } catch (err) {
    console.error('Error fetching stream status for snapshot:', err);
  }

  // Build challenge info if active
  let currentChallenge = null;
  if (session.current_challenge_session_id) {
    try {
      const cs = await prisma.challengeSession.findUnique({
        where: { id: session.current_challenge_session_id },
        include: { challenge: true },
      });

      if (cs) {
        currentChallenge = {
          sessionId: cs.id,
          id: cs.challenge.id,
          title: cs.challenge.title,
          description: cs.challenge.description,
          starterCode: cs.challenge.starterCode,
          language: cs.challenge.language,
          durationSeconds: cs.durationSeconds,
          startedAt: cs.startedAt.getTime(),
          solutionCode: session.solution_code || undefined,
        };
      }
    } catch (err) {
      console.error('Error fetching current challenge for snapshot:', err);
    }
  }

  // Check if user already submitted
  let mySubmission = null;
  if (currentChallenge) {
    try {
      const sub = await prisma.submission.findUnique({
        where: {
          challengeSessionId_userId: {
            challengeSessionId: currentChallenge.sessionId,
            userId,
          },
        },
      });
      if (sub) {
        mySubmission = {
          id: sub.id,
          status: sub.status,
          testResults: sub.testResults,
          aiHint: sub.aiHint,
        };
      }
    } catch (err) {
      console.error('Error fetching submission for snapshot:', err);
    }
  }

  const seq = parseInt(session.seq || '0', 10);

  socket.emit('session_snapshot', {
    type: 'session_snapshot',
    seq,
    streamId,
    payload: {
      hlsUrl,
      status: streamStatus,
      viewerCount: parseInt(session.viewer_count || '0', 10),
      currentChallenge,
      mySubmission,
    },
    serverTime: Date.now(),
  });
}

/**
 * Send recent events for replay.
 */
async function sendEventReplay(socket: Socket, streamId: string) {
  try {
    const rawEvents = await redis.zrange(`stream:${streamId}:events`, 0, -1);
    if (rawEvents.length > 0) {
      const events = rawEvents.map(e => JSON.parse(e));
      socket.emit('event_replay', {
        type: 'event_replay',
        streamId,
        payload: { events },
        serverTime: Date.now(),
      });
    }
  } catch (err) {
    console.error('Error fetching event replay:', err);
  }
}

/**
 * Get the Socket.IO server instance.
 */
export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/**
 * Publish an event to a stream room (used by API routes).
 */
export async function publishStreamEvent(
  streamId: string,
  type: string,
  payload: unknown
): Promise<number> {
  const seq = await redis.incr(`stream:${streamId}:seq`);

  const event: ServerEvent = {
    type,
    seq,
    streamId,
    payload,
    serverTime: Date.now(),
  };

  // Save event to Postgres for VOD
  await prisma.streamEvent.create({
    data: {
      streamId,
      type,
      seq,
      payload: payload as any,
      serverTime: new Date(event.serverTime),
    },
  });

  // Save event to replay log in Redis (for live reconnects)
  await redis.zadd(`stream:${streamId}:events`, event.serverTime, JSON.stringify(event));
  await redis.zremrangebyrank(`stream:${streamId}:events`, 0, -101);

  // Initialize emitter if needed
  if (!emitter) {
    emitter = new Emitter(redisPub);
  }

  // Emit via Redis Emitter (stateless broadcast)
  emitter.to(`stream:${streamId}`).emit(type, event);

  return seq;
}

/**
 * Deliver an event to a single user's private room (across all their sockets),
 * without persisting it as a stream event. Used for 1:1 messages like AI hints.
 */
export async function publishToUser(
  userId: string,
  type: string,
  payload: unknown
): Promise<void> {
  if (!emitter) {
    emitter = new Emitter(redisPub);
  }
  emitter.to(`user:${userId}`).emit(type, {
    type,
    payload,
    serverTime: Date.now(),
  });
}
