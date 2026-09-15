import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { prisma } from './lib/prisma';
import { initAIWorker, closeAIWorker } from './services/ai-worker';
import { closeRedis } from './lib/redis';

// Route imports
import authRoutes from './routes/auth';
import streamRoutes from './routes/streams';
import challengeRoutes from './routes/challenges';
import submissionRoutes from './routes/submissions';
import courseRoutes from './routes/courses';
import uploadRoutes from './routes/uploads';
import leaderboardRoutes from './routes/leaderboard';

async function main() {
  const app = express();
  const httpServer = createServer(app);

  // Trust the platform proxy (Render/Fly/Cloudflare) so Secure cookies and
  // req.protocol/IP resolve correctly behind TLS termination.
  app.set('trust proxy', 1);

  // ─── Security headers (helmet) ──────────────────────────
  // CSP is env-driven so the deployed WS origin is allowed (the old hardcoded
  // localhost value blocked the socket connection in production).
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 'unsafe-eval' retained for the Monaco editor's worker; drop it if you
        // switch Monaco to same-origin workers.
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", config.corsOrigin, config.wsPublicUrl],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: config.nodeEnv === 'production',
    crossOriginEmbedderPolicy: false, // allow cross-origin HLS segments
  }));

  // ─── Middleware ─────────────────────────────────────────
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));
  app.use(express.json({ limit: '1mb' }));

  // ─── Health Check ──────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── API Routes ────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/streams', streamRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/challenges', challengeRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Socket.IO ─────────────────────────────────────────
  // Socket.IO has been moved to ws-server.ts for horizontal scaling

  // ─── AI Worker ─────────────────────────────────────────
  initAIWorker();

  // ─── Start Server ──────────────────────────────────────
  // Verify DB connection with retry (for Neon serverless cold starts)
  for (let i = 1; i <= 5; i++) {
    try {
      await prisma.$connect();
      console.log('✓ PostgreSQL connected');
      break;
    } catch (err) {
      console.warn(`⚠️ PostgreSQL connection failed (attempt ${i}/5). Retrying in 3s...`);
      if (i === 5) throw err;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  httpServer.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║           🎬 DevCast Server                  ║
╠══════════════════════════════════════════════╣
║  HTTP:      http://localhost:${config.port}            ║
║  Env:       ${config.nodeEnv.padEnd(31)}║
║  AI:        Gemini (${config.geminiModel})        ║
╚══════════════════════════════════════════════╝
    `);
  });

  // ─── Graceful Shutdown ─────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    httpServer.close();
    await closeAIWorker();
    await closeRedis();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});
