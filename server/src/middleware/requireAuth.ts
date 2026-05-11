import type { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../auth/auth.service.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401, ErrorCode.AUTH_REQUIRED));
    return;
  }

  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}