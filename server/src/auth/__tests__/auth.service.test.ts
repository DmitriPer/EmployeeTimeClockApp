import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, UserRole } from '@app/shared';
import { login, logout } from '../auth.service.js';

vi.mock('../auth.repository.js', () => ({
  findUserByEmployeeId: vi.fn(),
  deleteUserRefreshTokens: vi.fn(),
  insertRefreshToken: vi.fn(),
  generateRawToken: vi.fn(() => 'rawtoken123'),
  hashToken: vi.fn(() => 'hashedtoken123'),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(() => 'mock.jwt.token'), verify: vi.fn() },
}));

vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'testsecret32charslongXXXXXXXXXXX', JWT_REFRESH_SECRET: 'testrefreshsecret32charsXXXXXXXXXX' },
}));

import * as authRepo from '../auth.repository.js';
import bcrypt from 'bcryptjs';

const mockUser = {
  id: 1,
  employee_id: 'EMP001',
  name: 'Dana Cohen',
  email: 'dana@example.com',
  password_hash: '$2b$12$hashedpassword',
  role: UserRole.EMPLOYEE,
  manager_id: null,
  is_active: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('login', () => {
  it('throws AUTH_INVALID_CREDENTIALS when user not found', async () => {
    vi.mocked(authRepo.findUserByEmployeeId).mockResolvedValue(undefined);

    await expect(login('EMP999', 'password123')).rejects.toMatchObject({
      code: ErrorCode.AUTH_INVALID_CREDENTIALS,
    });
  });

  it('throws AUTH_ACCOUNT_DISABLED when user is inactive', async () => {
    vi.mocked(authRepo.findUserByEmployeeId).mockResolvedValue({ ...mockUser, is_active: 0 });

    await expect(login('EMP001', 'password123')).rejects.toMatchObject({
      code: ErrorCode.AUTH_ACCOUNT_DISABLED,
    });
  });

  it('throws AUTH_INVALID_CREDENTIALS when password is wrong', async () => {
    vi.mocked(authRepo.findUserByEmployeeId).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(login('EMP001', 'wrongpassword')).rejects.toMatchObject({
      code: ErrorCode.AUTH_INVALID_CREDENTIALS,
    });
  });

  it('returns accessToken, refreshToken and user on valid credentials', async () => {
    vi.mocked(authRepo.findUserByEmployeeId).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(authRepo.deleteUserRefreshTokens).mockResolvedValue(undefined);
    vi.mocked(authRepo.insertRefreshToken).mockResolvedValue(undefined);

    const result = await login('EMP001', 'correctpassword');

    expect(result.accessToken).toBe('mock.jwt.token');
    expect(result.refreshToken).toBe('rawtoken123');
    expect(result.user).toEqual({ id: 1, name: 'Dana Cohen', role: UserRole.EMPLOYEE });
    expect(authRepo.deleteUserRefreshTokens).toHaveBeenCalledWith(1);
    expect(authRepo.insertRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, tokenHash: 'hashedtoken123' }),
    );
  });
});

describe('logout', () => {
  it('deletes all refresh tokens for the user', async () => {
    vi.mocked(authRepo.deleteUserRefreshTokens).mockResolvedValue(undefined);

    await logout(1);

    expect(authRepo.deleteUserRefreshTokens).toHaveBeenCalledWith(1);
  });
});