import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '@app/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { AppError } from '../lib/errors.js';
import * as service from './retroactive-requests.service.js';

export const retroactiveRequestsRouter = Router();

retroactiveRequestsRouter.use(requireAuth);

retroactiveRequestsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { date, clockInTime, clockOutTime, breaks, employeeNote } = req.body;
      if (!date || !clockInTime || !clockOutTime) {
        throw new AppError('date, clockInTime, and clockOutTime are required.', 400, ErrorCode.VALIDATION_ERROR);
      }
      const result = await service.submitRetroactiveRequest(req.user!.id, {
        date,
        clockInTime,
        clockOutTime,
        breaks,
        employeeNote,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

retroactiveRequestsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const results = await service.getMyRetroactiveRequests(req.user!.id);
      res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  },
);

retroactiveRequestsRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id ?? ''), 10);
      if (isNaN(id)) throw new AppError('Invalid request ID.', 400, ErrorCode.VALIDATION_ERROR);
      await service.deleteRetroactiveRequest(req.user!.id, id);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
);
