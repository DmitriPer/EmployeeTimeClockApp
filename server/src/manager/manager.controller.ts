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
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.getPendingOvertimeRequests(req.user!.id, req.user!.role);
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
      reviewerRole: req.user!.role,
      action: parsed.data.action,
      note: parsed.data.note ?? null,
    });

    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

const ReviewCorrectionSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(1000).nullable().optional(),
});

export async function handleGetCorrectionQueue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.getCorrectionRequests(req.user!.id, req.user!.role);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function handleReviewCorrectionRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestId = parseInt(String(req.params.id ?? ''), 10);
    if (isNaN(requestId)) {
      throw new AppError('Invalid request ID.', 400, ErrorCode.VALIDATION_ERROR);
    }

    const parsed = ReviewCorrectionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Invalid payload.', 400, ErrorCode.VALIDATION_ERROR);
    }

    await service.reviewCorrectionRequest({
      requestId,
      reviewerId: req.user!.id,
      reviewerRole: req.user!.role,
      action: parsed.data.action,
      note: parsed.data.note ?? null,
    });

    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function handleGetRetroactiveQueue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.getRetroactiveRequests(req.user!.id, req.user!.role);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function handleReviewRetroactiveRequest(
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
      throw new AppError(parsed.error.errors[0]?.message ?? 'Invalid payload.', 400, ErrorCode.VALIDATION_ERROR);
    }
    const result = await service.reviewRetroactiveRequest({
      requestId,
      reviewerId: req.user!.id,
      reviewerRole: req.user!.role,
      action: parsed.data.action,
      note: parsed.data.note ?? null,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

const FlaggedQuerySchema = z.object({
  employeeId: z.coerce.number().int().positive().optional(),
});

export async function handleReviewFlaggedSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const timeEntryId = parseInt(String(req.params.timeEntryId ?? ''), 10);
    if (isNaN(timeEntryId)) throw new AppError('Invalid entry ID.', 400, ErrorCode.VALIDATION_ERROR);
    const { breakEndTime } = req.body;
    if (!breakEndTime || typeof breakEndTime !== 'string') {
      throw new AppError('breakEndTime is required.', 400, ErrorCode.VALIDATION_ERROR);
    }
    await service.reviewFlaggedSession(req.user!.id, req.user!.role, timeEntryId, breakEndTime);
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function handleGetFlaggedSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = FlaggedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Invalid query parameters.', 400, ErrorCode.VALIDATION_ERROR);
    }
    const data = await service.getFlaggedSessions(req.user!.id, req.user!.role, parsed.data.employeeId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
