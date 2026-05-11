import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { ErrorCode } from '@app/shared';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many login attempts. Try again later.',
      },
    });
  },
});