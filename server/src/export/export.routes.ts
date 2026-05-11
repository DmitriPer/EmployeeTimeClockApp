import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ExportQuerySchema, ErrorCode } from '@app/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { AppError } from '../lib/errors.js';
import { generateExport } from './export.service.js';

export const exportRouter = Router();

exportRouter.use(requireAuth);

exportRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ExportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Validation error.', 400, ErrorCode.VALIDATION_ERROR);
    }

    const { from, to } = parsed.data;
    if (from && to && from > to) {
      throw new AppError('"From" date must be before "To" date.', 400, ErrorCode.VALIDATION_ERROR);
    }

    const { buffer, contentType, filename } = await generateExport(
      req.user!.id,
      req.user!.role,
      parsed.data,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});
