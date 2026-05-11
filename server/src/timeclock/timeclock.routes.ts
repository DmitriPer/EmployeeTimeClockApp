import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  handleGetStatus,
  handleClockIn,
  handleClockOut,
  handleBreakStart,
  handleBreakEnd,
} from './timeclock.controller.js';

export const timeclockRouter = Router();

timeclockRouter.use(requireAuth);

timeclockRouter.get('/status', handleGetStatus);
timeclockRouter.post('/clock-in', handleClockIn);
timeclockRouter.post('/clock-out', handleClockOut);
timeclockRouter.post('/break/start', handleBreakStart);
timeclockRouter.post('/break/end', handleBreakEnd);
