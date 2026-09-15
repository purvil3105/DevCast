import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { config } from '../config';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const BCRYPT_COST = 12;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ─── Validation schemas ──────────────────────────────────
const registerSchema = z.object({
  email: z.string().email().max(254).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  displayName: z.string().trim().min(1).max(80),
  role: z.enum(['VIEWER', 'INSTRUCTOR']),
});

const loginSchema = z.object({
  email: z.string().email().max(254).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  email: z.string().email().max(254).transform((e) => e.toLowerCase().trim()).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

// ─── Token helpers ───────────────────────────────────────
function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
}

/** Issue a refresh token and register its jti in Redis so it can be revoked/rotated. */
async function issueRefreshToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId, type: 'refresh', jti },
    config.jwtSecret,
    { expiresIn: config.refreshTokenExpiresIn as any }
  );
  await redis.set(`refresh:${userId}:${jti}`, '1', 'EX', REFRESH_TTL_SECONDS);
  return token;
}

function publicUser(user: { id: string; email: string; displayName: string; role: string }) {
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

/**
 * POST /api/auth/register — creates the selected learner or instructor account.
 */
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        displayName,
        role,
      },
    });

    const token = signAccessToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(user.id);

    res.status(201).json({ user: publicUser(user), token, refreshToken });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signAccessToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(user.id);

    res.json({ user: publicUser(user), token, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, displayName: true, role: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Verifies the refresh token, rotates it (old jti is revoked), and returns a fresh pair.
 */
router.post('/refresh', validateBody(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    let decoded: { userId: string; type: string; jti?: string };
    try {
      decoded = jwt.verify(refreshToken, config.jwtSecret) as any;
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    if (decoded.type !== 'refresh' || !decoded.jti) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const key = `refresh:${decoded.userId}:${decoded.jti}`;
    const exists = await redis.get(key);
    if (!exists) {
      res.status(401).json({ error: 'Refresh token revoked' });
      return;
    }

    // Rotate: kill the old token so it can't be replayed.
    await redis.del(key);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const token = signAccessToken(user.id, user.role);
    const newRefreshToken = await issueRefreshToken(user.id);

    res.json({ token, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * POST /api/auth/logout — revoke a refresh token (best-effort).
 */
router.post('/logout', validateBody(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as { userId: string; jti?: string };
      if (decoded.jti) await redis.del(`refresh:${decoded.userId}:${decoded.jti}`);
    } catch {
      // Token already invalid/expired — nothing to revoke.
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/auth/me — update profile (displayName, email).
 */
router.patch('/me', authenticate, validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const { displayName, email } = req.body;

    const updateData: { displayName?: string; email?: string } = {};
    if (displayName) updateData.displayName = displayName;
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.userId) {
        res.status(409).json({ error: 'Email already in use by another account' });
        return;
      }
      updateData.email = email;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'Nothing to update' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: { id: true, email: true, displayName: true, role: true },
    });

    res.json({ user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/auth/password — change password (revokes all refresh tokens).
 */
router.patch('/password', authenticate, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await prisma.user.update({ where: { id: req.userId }, data: { password: passwordHash } });

    // Invalidate all existing refresh tokens for this user after a password change.
    const keys = await redis.keys(`refresh:${req.userId}:*`);
    if (keys.length > 0) await redis.del(...keys);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
