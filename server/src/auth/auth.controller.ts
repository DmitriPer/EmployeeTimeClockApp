import type { Request, Response, NextFunction } from 'express';
import { ErrorCode, LoginSchema } from '@app/shared';
import { AppError } from '../lib/errors.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function handleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Validation error', 400, ErrorCode.VALIDATION_ERROR);
    }

    const result = await authService.login(parsed.data.employeeId, parsed.data.password);

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/auth/refresh',
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFRESH_COOKIE_TTL_MS,
    });

    res.status(200).json({
      success: true,
      data: { accessToken: result.accessToken, user: result.user },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleLogout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(req.user!.id);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth/refresh' });
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}