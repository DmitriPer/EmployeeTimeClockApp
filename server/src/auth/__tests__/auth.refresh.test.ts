import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, UserRole } from '@app/shared';
import { refreshAccessToken } from '../auth.service.js';

vi.mock('../auth.repository.js', () => ({
  findUserByEmployeeId: vi.fn(),
  findUserById: vi.fn(),
  findRefreshTokenByHash: vi.fn(),
  deleteUserRefreshTokens: vi.fn(),
  insertRefreshToken: vi.fn(),
  generateRawToken: vi.fn(() => 'rawtoken123'),
  hashToken: vi.fn((t: string) => `hashed:${t}`),
}));

vi.mock('bcryptjs', () => ({ default: { compare: vi.fn() } }));

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(() => 'new.access.token'), verify: vi.fn() },
}));

vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'testsecret32charslongXXXXXXXXXXX' },
}));

import * as authRepo from '../auth.repository.js';

const mockStoredToken = {
  id: 1,
  user_id: 42,
  token_hash: 'hashed:somerawtoken',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  created_at: new Date(),
};

const mockUser = {
  id: 42,
  employee_id: 'EMP001',
  name: 'Dana Cohen',
  email: 'dana@example.com',
  password_hash: '$2b$12$hash',
  role: UserRole.EMPLOYEE,
  is_active: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('refreshAccessToken', () => {
  it('throws AUTH_INVALID_REFRESH_TOKEN when token not found in DB', async () => {
    vi.mocked(authRepo.findRefreshTokenByHash).mockResolvedValue(undefined);

    await expect(refreshAccessToken('unknowntoken')).rejects.toMatchObject({
      code: ErrorCode.AUTH_INVALID_REFRESH_TOKEN,
    });
  });

  it('throws AUTH_INVALID_REFRESH_TOKEN and cleans up expired token', async () => {
    vi.mocked(authRepo.findRefreshTokenByHash).mockResolvedValue({
      ...mockStoredToken,
      expires_at: new Date(Date.now() - 1000),
    });
    vi.mocked(authRepo.deleteUserRefreshTokens).mockResolvedValue(undefined);

    await expect(refreshAccessToken('expiredtoken')).rejects.toMatchObject({
      code: ErrorCode.AUTH_INVALID_REFRESH_TOKEN,
    });
    expect(authRepo.deleteUserRefreshTokens).toHaveBeenCalledWith(42);
  });

  it('throws AUTH_INVALID_REFRESH_TOKEN when user is inactive', async () => {
    vi.mocked(authRepo.findRefreshTokenByHash).mockResolvedValue(mockStoredToken);
    vi.mocked(authRepo.findUserById).mockResolvedValue({ ...mockUser, is_active: 0 });

    await expect(refreshAccessToken('somerawtoken')).rejects.toMatchObject({
      code: ErrorCode.AUTH_INVALID_REFRESH_TOKEN,
    });
  });

  it('returns new accessToken for valid refresh token', async () => {
    vi.mocked(authRepo.findRefreshTokenByHash).mockResolvedValue(mockStoredToken);
    vi.mocked(authRepo.findUserById).mockResolvedValue(mockUser);

    const result = await refreshAccessToken('somerawtoken');

    expect(result.accessToken).toBe('new.access.token');
  });
});
