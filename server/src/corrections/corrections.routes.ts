import { Router } from 'express';
import { UserRole, CorrectionSchema, ErrorCode } from '@app/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/errors.js';
import { sendOk } from '../lib/response.js';
import * as service from './corrections.service.js';

export const correctionsRouter = Router();

correctionsRouter.use(requireAuth);
correctionsRouter.use(requireRoles(UserRole.MANAGER, UserRole.ADMIN));

correctionsRouter.patch('/:id/correct', asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id ?? ''), 10);
  if (isNaN(id)) throw new AppError('Invalid entry ID.', 400, ErrorCode.VALIDATION_ERROR);

  const parsed = CorrectionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Validation error.', 400, ErrorCode.VALIDATION_ERROR);
  }

  const result = await service.correctTimeEntry(id, req.user!.id, parsed.data);
  sendOk(res, result);
}));

correctionsRouter.get('/:id/audit', asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id ?? ''), 10);
  if (isNaN(id)) throw new AppError('Invalid entry ID.', 400, ErrorCode.VALIDATION_ERROR);

  const result = await service.getAuditLog(id);
  sendOk(res, result);
}));
