import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  wsPort: parseInt(process.env.WS_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Public WS origin the browser connects to (used to build the CSP connect-src).
  wsPublicUrl: process.env.WS_PUBLIC_URL || 'ws://localhost:3001',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT — NO fallback secret. Missing/weak secrets are rejected below.
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  // Shared secret for server-to-server (media-server → API) calls.
  internalSecret: process.env.INTERNAL_API_SECRET || '',

  // AI (Google Gemini)
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  // Cloudinary (stream thumbnail uploads). Optional — if unset, the upload
  // endpoint returns 503 and streams simply have no thumbnail.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // Sandbox
  sandboxUrl: process.env.SANDBOX_URL || 'http://localhost:4000',
  sandboxTimeoutMs: parseInt(process.env.SANDBOX_TIMEOUT_MS || '10000', 10),
} as const;

// ─── Fail-fast validation ────────────────────────────────
const required = ['DATABASE_URL', 'JWT_SECRET'] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    console.error('   Copy .env.example to .env and fill in values.');
    process.exit(1);
  }
}

// Reject known-default / weak JWT secrets in production — a public secret means
// anyone can forge instructor tokens (full auth bypass).
const WEAK_SECRETS = new Set([
  'devcast-dev-secret-change-in-production',
  'change-me-to-a-random-64-char-string-in-production',
]);
if (
  config.nodeEnv === 'production' &&
  (config.jwtSecret.length < 32 || WEAK_SECRETS.has(config.jwtSecret))
) {
  console.error('❌ JWT_SECRET is missing, too short, or a known default value.');
  console.error('   Generate a strong secret with:  openssl rand -hex 32');
  process.exit(1);
}

if (config.nodeEnv === 'production' && !config.internalSecret) {
  console.error('❌ INTERNAL_API_SECRET must be set in production (media-server → API auth).');
  process.exit(1);
}

if (!config.geminiApiKey) {
  console.warn('⚠️  GEMINI_API_KEY not set — AI hints will use static fallbacks.');
}

const cloudinaryReady =
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret;
if (!cloudinaryReady) {
  console.warn('⚠️  Cloudinary not fully configured — stream thumbnail uploads are disabled.');
}
