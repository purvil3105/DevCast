import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth';
import { cloudinary, cloudinaryConfigured } from '../lib/cloudinary';

const router = Router();

// In-memory storage — the buffer streams straight to Cloudinary, never to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, WEBP, or GIF images are allowed'));
  },
});

// Wrap multer so its errors (size/type) become clean 400s instead of a generic
// 500 from the global handler.
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError
          ? err.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be 5 MB or smaller'
            : err.message
          : (err as Error).message || 'Upload failed';
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

/**
 * POST /api/uploads/image
 * Instructor-only. Accepts a single multipart image field ("image"), uploads it
 * to Cloudinary, and returns { url }. Used for stream thumbnails.
 */
router.post(
  '/image',
  authenticate,
  requireRole('INSTRUCTOR'),
  handleUpload,
  async (req: Request, res: Response) => {
    if (!cloudinaryConfigured) {
      res.status(503).json({ error: 'Image uploads are not configured on this server.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided (field name must be "image").' });
      return;
    }

    try {
      const url = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'devcast/thumbnails',
            resource_type: 'image',
            // Normalize huge uploads to a sensible card size.
            transformation: [{ width: 1280, height: 720, crop: 'limit' }],
          },
          (error, result) => {
            if (error || !result) return reject(error || new Error('Upload failed'));
            resolve(result.secure_url);
          }
        );
        stream.end(req.file!.buffer);
      });

      res.status(201).json({ url });
    } catch (err) {
      console.error('Image upload error:', err);
      res.status(502).json({ error: 'Image upload failed' });
    }
  }
);

export default router;
