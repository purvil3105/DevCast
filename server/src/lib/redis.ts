import Redis from 'ioredis';
import { config } from '../config';

// Main Redis client for general operations (cache, rate limiting, pub/sub publish)
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: true,
  family: 4, // Force IPv4 to fix Upstash latency/timeout issues
  tls: config.redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 5000);
    console.warn(`⚠️  Redis reconnecting (attempt ${times}, delay ${delay}ms)`);
    return delay;
  },
});

redis.on('connect', () => console.log('✓ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

// Subscriber client — Redis requires separate connections for pub/sub
export const redisSub = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  family: 4,
  tls: config.redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
});
redisSub.on('error', (err) => console.error('❌ Redis Sub error:', err.message));

// Publisher client — dedicated for publishing events
export const redisPub = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  family: 4,
  tls: config.redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
});
redisPub.on('error', (err) => console.error('❌ Redis Pub error:', err.message));

/**
 * Graceful shutdown
 */
export async function closeRedis(): Promise<void> {
  await Promise.all([redis.quit(), redisSub.quit(), redisPub.quit()]);
}
