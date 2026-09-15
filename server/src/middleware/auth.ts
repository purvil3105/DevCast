import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';

// Extend Express Request with user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Verify JWT and attach userId + role to request.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      role: string;
    };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require a specific role (e.g., 'INSTRUCTOR').
 * Must be used after authenticate().
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.userRole !== role) {
      res.status(403).json({ error: `Requires ${role} role` });
      return;
    }
    next();
  };
}

/**
 * Require a valid shared secret for internal server-to-server calls
 * (e.g., the media server notifying the API that a VOD is ready).
 * The caller must send `X-Internal-Secret: <INTERNAL_API_SECRET>`.
 */
export function requireInternalSecret(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-internal-secret'];
  if (!config.internalSecret || provided !== config.internalSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

/**
 * Require that the authenticated user owns the stream.
 * Must be used after authenticate(). Stream ID comes from req.params.streamId.
 */
export function requireStreamOwner() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const streamId = req.params.streamId as string;
    if (!streamId) {
      res.status(400).json({ error: 'Missing streamId parameter' });
      return;
    }

    try {
      const stream = await prisma.stream.findUnique({
        where: { id: streamId },
        include: { course: { select: { instructorId: true } } },
      }) as any;

      if (!stream) {
        res.status(404).json({ error: 'Stream not found' });
        return;
      }

      if (stream.course.instructorId !== req.userId) {
        res.status(403).json({ error: 'Not the stream owner' });
        return;
      }

      next();
    } catch (err) {
      console.error('requireStreamOwner error:', err);
      res.status(500).json({ error: 'Internal server error verifying stream ownership' });
    }
  };
}
