import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { sendOk, sendCreated } from '../lib/response.js';
import * as service from './timeclock.service.js';

export const timeclockRouter = Router();

timeclockRouter.use(requireAuth);

timeclockRouter.get('/status', asyncHandler(async (req, res) => {
  const result = await service.getStatus(req.user!.id);
  sendOk(res, result);
}));

timeclockRouter.post('/clock-in', asyncHandler(async (req, res) => {
  const result = await service.clockIn(req.user!.id);
  sendCreated(res, result);
}));

timeclockRouter.post('/clock-out', asyncHandler(async (req, res) => {
  const result = await service.clockOut(req.user!.id);
  sendOk(res, result);
}));

timeclockRouter.post('/break/start', asyncHandler(async (req, res) => {
  const result = await service.startBreak(req.user!.id);
  sendCreated(res, result);
}));

timeclockRouter.post('/break/end', asyncHandler(async (req, res) => {
  const result = await service.endBreak(req.user!.id);
  sendOk(res, result);
}));
