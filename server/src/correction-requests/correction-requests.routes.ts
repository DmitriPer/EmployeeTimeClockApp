import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ErrorCode, CorrectionRequestSchema, UpdateCorrectionRequestSchema } from '@app/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { AppError } from '../lib/errors.js';
import { sendOk, sendCreated, sendEmpty } from '../lib/response.js';
import * as service from './correction-requests.service.js';

export const correctionRequestsRouter = Router();

correctionRequestsRouter.use(requireAuth);

correctionRequestsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CorrectionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.errors[0]?.message ?? 'Validation error',
          400,
          ErrorCode.VALIDATION_ERROR,
        );
      }
      const result = await service.submitCorrectionRequest(req.user!.id, req.user!.role, parsed.data);
      sendCreated(res, result);
    } catch (err) {
      next(err);
    }
  },
);

correctionRequestsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const timeEntryId = parseInt(String(req.query.timeEntryId ?? ''), 10);
      if (isNaN(timeEntryId)) {
        throw new AppError('timeEntryId query param is required.', 400, ErrorCode.VALIDATION_ERROR);
      }
      const result = await service.getCorrectionRequestForEntry(req.user!.id, timeEntryId);
      sendOk(res, result);
    } catch (err) {
      next(err);
    }
  },
);

correctionRequestsRouter.patch(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id ?? ''), 10);
      if (isNaN(id)) throw new AppError('Invalid request ID.', 400, ErrorCode.VALIDATION_ERROR);

      const parsed = UpdateCorrectionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.errors[0]?.message ?? 'Validation error',
          400,
          ErrorCode.VALIDATION_ERROR,
        );
      }
      const result = await service.updateCorrectionRequest(req.user!.id, id, parsed.data);
      sendOk(res, result);
    } catch (err) {
      next(err);
    }
  },
);

correctionRequestsRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id ?? ''), 10);
      if (isNaN(id)) throw new AppError('Invalid request ID.', 400, ErrorCode.VALIDATION_ERROR);
      await service.deleteCorrectionRequest(req.user!.id, id);
      sendEmpty(res);
    } catch (err) {
      next(err);
    }
  },
);
