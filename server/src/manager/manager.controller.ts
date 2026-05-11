import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ErrorCode } from '@app/shared';
import { AppError } from '../lib/errors.js';
import * as service from './manager.service.js';

const ReviewSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(1000).nullable().optional(),
});

export async function handleGetOvertimeQueue(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.getPendingOvertimeRequests();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function handleReviewOvertime(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestId = parseInt(String(req.params.id ?? ''), 10);
    if (isNaN(requestId)) {
      throw new AppError('Invalid request ID.', 400, ErrorCode.VALIDATION_ERROR);
    }

    const parsed = ReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid review payload.', 400, ErrorCode.VALIDATION_ERROR);
    }

    await service.reviewOvertimeRequest({
      requestId,
      reviewerId: req.user!.id,
      action: parsed.data.action,
      note: parsed.data.note ?? null,
    });

    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function handleGetFlaggedSessions(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.getFlaggedSessions();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
