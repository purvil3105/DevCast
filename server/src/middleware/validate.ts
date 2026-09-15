import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validate and coerce `req.body` against a Zod schema.
 * On success, the parsed (and stripped) value replaces req.body so downstream
 * handlers only ever see known, typed fields.
 * On failure, returns 400 with field-level messages (no stack traces).
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = result.error as ZodError;
      res.status(400).json({
        error: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
