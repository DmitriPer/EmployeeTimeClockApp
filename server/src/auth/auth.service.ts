import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ErrorCode, UserRole } from '@app/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import * as authRepo from './auth.repository.js';

const REFRESH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

export async function login(employeeId: string, password: string) {
  const user = await authRepo.findUserByEmployeeId(employeeId);

  if (!user) {
    throw new AppError('Invalid credentials', 401, ErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  if (!user.is_active) {
    throw new AppError('Account is disabled', 403, ErrorCode.AUTH_ACCOUNT_DISABLED);
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401, ErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  await authRepo.deleteUserRefreshTokens(user.id);

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '15m' },
  );

  const rawRefreshToken = authRepo.generateRawToken();
  const tokenHash = authRepo.hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await authRepo.insertRefreshToken({ userId: user.id, tokenHash, expiresAt });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: { id: user.id, name: user.name, role: user.role as UserRole },
  };
}

export async function logout(userId: number): Promise<void> {
  await authRepo.deleteUserRefreshTokens(userId);
}

export async function refreshAccessToken(rawRefreshToken: string): Promise<{ accessToken: string }> {
  const tokenHash = authRepo.hashToken(rawRefreshToken);
  const stored = await authRepo.findRefreshTokenByHash(tokenHash);

  if (!stored) {
    throw new AppError('Invalid refresh token', 401, ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  if (stored.expires_at < new Date()) {
    await authRepo.deleteUserRefreshTokens(stored.user_id);
    throw new AppError('Invalid refresh token', 401, ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  const user = await authRepo.findUserById(stored.user_id);
  if (!user || !user.is_active) {
    throw new AppError('Invalid refresh token', 401, ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '15m' },
  );

  return { accessToken };
}

export function verifyAccessToken(token: string): { sub: number; role: UserRole } {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as unknown as { sub: number; role: UserRole };
    return payload;
  } catch {
    throw new AppError('Authentication required', 401, ErrorCode.AUTH_REQUIRED);
  }
}