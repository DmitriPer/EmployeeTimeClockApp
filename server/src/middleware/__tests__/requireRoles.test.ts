import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { UserRole, ErrorCode } from '@app/shared';
import { requireRoles } from '../requireRoles.js';

function makeReq(user?: { id: number; role: UserRole }): Request {
  return { user } as unknown as Request;
}

const res = {} as Response;

describe('requireRoles', () => {
  it('calls next with AUTH_REQUIRED when req.user is absent', () => {
    const next = vi.fn() as unknown as NextFunction;
    requireRoles(UserRole.MANAGER)(makeReq(), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: ErrorCode.AUTH_REQUIRED }));
  });

  it('calls next with FORBIDDEN when role does not match', () => {
    const next = vi.fn() as unknown as NextFunction;
    requireRoles(UserRole.MANAGER, UserRole.ADMIN)(
      makeReq({ id: 1, role: UserRole.EMPLOYEE }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: ErrorCode.FORBIDDEN }));
  });

  it('calls next with no argument when role matches', () => {
    const next = vi.fn() as unknown as NextFunction;
    requireRoles(UserRole.MANAGER, UserRole.ADMIN)(
      makeReq({ id: 1, role: UserRole.MANAGER }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with no argument for ADMIN when ADMIN is allowed', () => {
    const next = vi.fn() as unknown as NextFunction;
    requireRoles(UserRole.MANAGER, UserRole.ADMIN)(
      makeReq({ id: 1, role: UserRole.ADMIN }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });
});
