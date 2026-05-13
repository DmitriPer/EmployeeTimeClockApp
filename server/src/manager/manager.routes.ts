import { Router } from 'express';
import { z } from 'zod';
import { ErrorCode, UserRole } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { sendOk, sendEmpty } from '../lib/response.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import * as service from './manager.service.js';

const ReviewSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(1000).nullable().optional(),
});

const FlaggedQuerySchema = z.object({
  employeeId: z.coerce.number().int().positive().optional(),
});

export const managerRouter = Router();

managerRouter.use(requireAuth, requireRoles(UserRole.MANAGER, UserRole.ADMIN));

managerRouter.get('/overtime', asyncHandler(async (req, res) => {
  const data = await service.getPendingOvertimeRequests(req.user!.id, req.user!.role);
  sendOk(res, data);
}));

managerRouter.patch('/overtime/:id/review', asyncHandler(async (req, res) => {
  const requestId = parseInt(String(req.params.id ?? ''), 10);
  if (isNaN(requestId)) throw new AppError('Invalid request ID.', 400, ErrorCode.VALIDATION_ERROR);
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('Invalid review payload.', 400, ErrorCode.VALIDATION_ERROR);
  await service.reviewOvertimeRequest({
    requestId,
    reviewerId: req.user!.id,
    reviewerRole: req.user!.role,
    action: parsed.data.action,
    note: parsed.data.note ?? null,
  });
  sendEmpty(res);
}));

managerRouter.get('/flagged', asyncHandler(async (req, res) => {
  const parsed = FlaggedQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError('Invalid query parameters.', 400, ErrorCode.VALIDATION_ERROR);
  const data = await service.getFlaggedSessions(req.user!.id, req.user!.role, parsed.data.employeeId);
  sendOk(res, data);
}));

managerRouter.patch('/flagged/:timeEntryId/review', asyncHandler(async (req, res) => {
  const timeEntryId = parseInt(String(req.params.timeEntryId ?? ''), 10);
  if (isNaN(timeEntryId)) throw new AppError('Invalid entry ID.', 400, ErrorCode.VALIDATION_ERROR);
  const { breakEndTime } = req.body as { breakEndTime?: unknown };
  if (!breakEndTime || typeof breakEndTime !== 'string') {
    throw new AppError('breakEndTime is required.', 400, ErrorCode.VALIDATION_ERROR);
  }
  await service.reviewFlaggedSession(req.user!.id, req.user!.role, timeEntryId, breakEndTime);
  sendEmpty(res);
}));

managerRouter.get('/correction-requests', asyncHandler(async (req, res) => {
  const data = await service.getCorrectionRequests(req.user!.id, req.user!.role);
  sendOk(res, data);
}));

managerRouter.patch('/correction-requests/:id/review', asyncHandler(async (req, res) => {
  const requestId = parseInt(String(req.params.id ?? ''), 10);
  if (isNaN(requestId)) throw new AppError('Invalid request ID.', 400, ErrorCode.VALIDATION_ERROR);
  const parsed = ReviewSchema.safeParse(req.body);
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
  sendEmpty(res);
}));

managerRouter.get('/retroactive-requests', asyncHandler(async (req, res) => {
  const data = await service.getRetroactiveRequests(req.user!.id, req.user!.role);
  sendOk(res, data);
}));

managerRouter.patch('/retroactive-requests/:id/review', asyncHandler(async (req, res) => {
  const requestId = parseInt(String(req.params.id ?? ''), 10);
  if (isNaN(requestId)) throw new AppError('Invalid request ID.', 400, ErrorCode.VALIDATION_ERROR);
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
  sendOk(res, result);
}));
