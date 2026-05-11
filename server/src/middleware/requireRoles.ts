import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@app/shared';
import { ErrorCode } from '@app/shared';
import { AppError } from '../lib/errors.js';

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, ErrorCode.AUTH_REQUIRED));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('Forbidden', 403, ErrorCode.FORBIDDEN));
      return;
    }
    next();
  };
}
