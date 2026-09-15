import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/courses/my
 * Get courses owned by the authenticated instructor.
 */
router.get('/my', authenticate, requireRole('INSTRUCTOR'), async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
      },
    });

    res.json({ courses });
  } catch (err) {
    console.error('Get my courses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/courses
 * Create a new course (topic).
 */
router.post('/', authenticate, requireRole('INSTRUCTOR'), async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    // Generate a slug
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        instructorId: req.userId!,
      },
    });

    res.status(201).json({ course });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
