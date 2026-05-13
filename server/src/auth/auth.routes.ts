import { Router } from 'express';
import { ErrorCode, LoginSchema } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { sendOk, sendEmpty } from '../lib/response.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_TTL_MS = 8 * 60 * 60 * 1000;

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
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
  sendOk(res, { accessToken: result.accessToken, user: result.user });
}));

authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!rawToken) {
    throw new AppError('Invalid refresh token', 401, ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }
  const result = await authService.refreshAccessToken(rawToken);
  sendOk(res, { accessToken: result.accessToken });
}));

authRouter.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await authService.logout(req.user!.id);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth/refresh' });
  sendEmpty(res);
}));
