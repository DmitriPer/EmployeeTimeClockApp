import { Router } from 'express';
import { z } from 'zod';
import { ErrorCode } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { sendOk, sendEmpty } from '../lib/response.js';
import { requireAuth } from '../middleware/requireAuth.js';
import * as service from './history.service.js';

const HistoryQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.coerce.number().int().positive().optional(),
});

const NoteBodySchema = z.object({
  note: z.string().max(1000).nullable(),
});

export const historyRouter = Router();

historyRouter.use(requireAuth);

historyRouter.get('/', asyncHandler(async (req, res) => {
  const parsed = HistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError('Invalid query parameters.', 400, ErrorCode.VALIDATION_ERROR);
  }
  const entries = await service.getHistory({
    requesterId: req.user!.id,
    requesterRole: req.user!.role,
    targetUserId: parsed.data.userId,
    from: parsed.data.from,
    to: parsed.data.to,
  });
  sendOk(res, entries);
}));

historyRouter.patch('/entries/:entryId/note', asyncHandler(async (req, res) => {
  const entryId = parseInt(String(req.params.entryId ?? ''), 10);
  if (isNaN(entryId)) {
    throw new AppError('Invalid entry ID.', 400, ErrorCode.VALIDATION_ERROR);
  }
  const parsed = NoteBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Invalid note.', 400, ErrorCode.VALIDATION_ERROR);
  }
  await service.updateNote({ requesterId: req.user!.id, entryId, note: parsed.data.note });
  sendEmpty(res);
}));
