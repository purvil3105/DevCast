import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

/**
 * Redis sliding-window rate limiter.
 * Uses INCR + EXPIRE pattern from system design §5 Redis Key Structures.
 *
 * @param keyPrefix - e.g., 'ratelimit:sub' or 'ratelimit:hint'
 * @param maxRequests - max allowed in the window
 * @param windowSeconds - window duration
 * @param keySuffix - function to extract the rate limit key suffix from the request
 */
export function rateLimit(
  keyPrefix: string,
  maxRequests: number,
  windowSeconds: number,
  keySuffix: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const suffix = keySuffix(req);
    const key = `${keyPrefix}:${suffix}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        // First request in this window — set expiry
        await redis.expire(key, windowSeconds);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        const ttl = await redis.ttl(key);
        res.setHeader('Retry-After', ttl > 0 ? ttl : windowSeconds);
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: ttl > 0 ? ttl : windowSeconds,
        });
        return;
      }

      next();
    } catch (err) {
      // Fail open — if Redis is down, allow the request through (§9.1)
      console.warn('⚠️  Rate limit check failed (Redis), failing open:', (err as Error).message);
      next();
    }
  };
}

// ─── Pre-configured rate limiters per §10.4 ──────────────
// NOTE: this is a FIXED-window limiter (INCR + EXPIRE), not a true sliding
// window — it can allow up to 2× the limit across a window boundary. That is an
// acceptable trade-off for the free tier; see Phase 2 for a ZSET sliding window.

/** Final submission endpoint: 5 req/5min per user per challenge session */
export const submissionRateLimit = rateLimit(
  'ratelimit:sub',
  5,
  300,
  (req) => `${req.userId}:${req.body?.challengeSessionId || 'unknown'}`
);

/** "Run" (test without saving): separate budget so it can't starve final submits */
export const runRateLimit = rateLimit(
  'ratelimit:run',
  20,
  300,
  (req) => `${req.userId}:${req.body?.challengeSessionId || 'unknown'}`
);

/** AI hint: 3 req per challenge per user */
export const hintRateLimit = rateLimit(
  'ratelimit:hint',
  3,
  3600,
  (req) => `${req.userId}:${req.body?.challengeSessionId || 'unknown'}`
);

/** Challenge trigger: 1/min per stream */
export const challengeTriggerRateLimit = rateLimit(
  'ratelimit:trigger',
  1,
  60,
  (req) => req.params.streamId as string
);
