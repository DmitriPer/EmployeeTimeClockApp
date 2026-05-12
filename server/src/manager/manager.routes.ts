import { Router } from 'express';
import { UserRole } from '@app/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import {
  handleGetOvertimeQueue,
  handleReviewOvertime,
  handleGetFlaggedSessions,
  handleGetCorrectionQueue,
  handleReviewCorrectionRequest,
} from './manager.controller.js';

export const managerRouter = Router();

managerRouter.use(requireAuth, requireRoles(UserRole.MANAGER, UserRole.ADMIN));

managerRouter.get('/overtime', handleGetOvertimeQueue);
managerRouter.patch('/overtime/:id/review', handleReviewOvertime);
managerRouter.get('/flagged', handleGetFlaggedSessions);
managerRouter.get('/correction-requests', handleGetCorrectionQueue);
managerRouter.patch('/correction-requests/:id/review', handleReviewCorrectionRequest);
