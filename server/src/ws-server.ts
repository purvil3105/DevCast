import 'express-async-errors';
import express from 'express';
import { createServer } from 'http';
import { config } from './config';
import { initSocketIO } from './lib/socket';
import { closeRedis } from './lib/redis';

async function main() {
  const app = express();
  const httpServer = createServer(app);

  // ─── Health Check ──────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Socket.IO ─────────────────────────────────────────
  initSocketIO(httpServer);

  // WS Server runs on config.wsPort (default 3001) — distinct from the API (3000)
  const wsPort = config.wsPort;

  httpServer.listen(wsPort, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║           🔌 DevCast WS Server               ║
╠══════════════════════════════════════════════╣
║  WebSocket: ws://localhost:${wsPort}              ║
║  Env:       ${config.nodeEnv.padEnd(31)}║
╚══════════════════════════════════════════════╝
    `);
  });

  // ─── Graceful Shutdown ─────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down WS server gracefully...`);
    httpServer.close();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('❌ WS Server failed to start:', err);
  process.exit(1);
});
