import type { Request, Response, NextFunction } from 'express';
import * as service from './timeclock.service.js';

export async function handleGetStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getStatus(req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleClockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.clockIn(req.user!.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleClockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.clockOut(req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleBreakStart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.startBreak(req.user!.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleBreakEnd(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.endBreak(req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
