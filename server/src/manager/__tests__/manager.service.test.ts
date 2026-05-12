import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, UserRole } from '@app/shared';
import { getPendingOvertimeRequests, reviewOvertimeRequest, getFlaggedSessions, reviewFlaggedSession } from '../manager.service.js';

vi.mock('../manager.repository.js', () => ({
  findPendingOvertimeRequests: vi.fn(),
  findOvertimeRequestById: vi.fn(),
  updateOvertimeRequest: vi.fn(),
  findFlaggedSessions: vi.fn(),
  findFlaggedEntryWithBreak: vi.fn(),
  updateFlaggedSessionReview: vi.fn(),
}));

vi.mock('../../users/users.repository.js', () => ({
  findUserById: vi.fn(),
}));

import * as repo from '../manager.repository.js';
import * as usersRepo from '../../users/users.repository.js';

const now = new Date('2024-06-01T10:00:00.000Z');

const pendingOtRow = {
  id: 1,
  user_id: 10,
  time_entry_id: 42,
  status: 'PENDING' as const,
  overtime_minutes: 30,
  manager_note: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: now,
  clock_in_at: new Date('2024-06-01T06:00:00.000Z'),
  clock_out_at: new Date('2024-06-01T15:30:00.000Z'),
  employee_name: 'Dana Cohen',
  employee_id: 'EMP001',
};

const employeeRow = {
  id: 10,
  employee_id: 'EMP001',
  name: 'Dana Cohen',
  email: 'dana@co.com',
  password_hash: 'hash',
  role: UserRole.EMPLOYEE,
  is_active: 1,
  manager_id: 3,
  created_at: now,
  updated_at: now,
};

beforeEach(() => vi.clearAllMocks());

describe('getPendingOvertimeRequests', () => {
  it('returns mapped overtime requests for ADMIN (no manager filter)', async () => {
    vi.mocked(repo.findPendingOvertimeRequests).mockResolvedValue([pendingOtRow]);

    const result = await getPendingOvertimeRequests(5, UserRole.ADMIN);

    expect(repo.findPendingOvertimeRequests).toHaveBeenCalledWith(undefined);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      overtimeMinutes: 30,
      status: 'PENDING',
      employeeName: 'Dana Cohen',
      employeeId: 'EMP001',
    });
  });

  it('passes managerId to repo when requester is MANAGER', async () => {
    vi.mocked(repo.findPendingOvertimeRequests).mockResolvedValue([]);

    await getPendingOvertimeRequests(3, UserRole.MANAGER);

    expect(repo.findPendingOvertimeRequests).toHaveBeenCalledWith(3);
  });

  it('returns empty array when no pending requests', async () => {
    vi.mocked(repo.findPendingOvertimeRequests).mockResolvedValue([]);

    const result = await getPendingOvertimeRequests(5, UserRole.ADMIN);

    expect(result).toEqual([]);
  });
});

describe('reviewOvertimeRequest', () => {
  it('throws NOT_FOUND when request does not exist', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue(undefined);

    await expect(
      reviewOvertimeRequest({ requestId: 99, reviewerId: 5, reviewerRole: UserRole.ADMIN, action: 'APPROVED', note: null }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('throws OT_ALREADY_REVIEWED when status is not PENDING', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue({
      ...pendingOtRow,
      status: 'APPROVED' as const,
    });

    await expect(
      reviewOvertimeRequest({ requestId: 1, reviewerId: 5, reviewerRole: UserRole.ADMIN, action: 'REJECTED', note: null }),
    ).rejects.toMatchObject({ code: ErrorCode.OT_ALREADY_REVIEWED });
  });

  it('calls updateOvertimeRequest with correct params on approval', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue(pendingOtRow);
    vi.mocked(repo.updateOvertimeRequest).mockResolvedValue(undefined);

    await reviewOvertimeRequest({
      requestId: 1,
      reviewerId: 5,
      reviewerRole: UserRole.ADMIN,
      action: 'APPROVED',
      note: 'Authorised',
    });

    expect(repo.updateOvertimeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, status: 'APPROVED', reviewedBy: 5, managerNote: 'Authorised' }),
    );
  });

  it('calls updateOvertimeRequest with REJECTED status', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue(pendingOtRow);
    vi.mocked(repo.updateOvertimeRequest).mockResolvedValue(undefined);

    await reviewOvertimeRequest({ requestId: 1, reviewerId: 5, reviewerRole: UserRole.ADMIN, action: 'REJECTED', note: null });

    expect(repo.updateOvertimeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REJECTED' }),
    );
  });

  it('throws FORBIDDEN when MANAGER reviews request from an employee not assigned to them', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue(pendingOtRow);
    vi.mocked(usersRepo.findUserById).mockResolvedValue({ ...employeeRow, manager_id: 99 });

    await expect(
      reviewOvertimeRequest({ requestId: 1, reviewerId: 3, reviewerRole: UserRole.MANAGER, action: 'APPROVED', note: null }),
    ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN, statusCode: 403 });
  });

  it('allows MANAGER to review request from their own assigned employee', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue(pendingOtRow);
    vi.mocked(usersRepo.findUserById).mockResolvedValue({ ...employeeRow, manager_id: 3 });
    vi.mocked(repo.updateOvertimeRequest).mockResolvedValue(undefined);

    await expect(
      reviewOvertimeRequest({ requestId: 1, reviewerId: 3, reviewerRole: UserRole.MANAGER, action: 'APPROVED', note: null }),
    ).resolves.toBeUndefined();
  });
});

describe('getFlaggedSessions', () => {
  it('returns { sessions, total } with correct shape for ADMIN', async () => {
    vi.mocked(repo.findFlaggedSessions).mockResolvedValue([
      {
        id: 42,
        user_id: 10,
        clock_in_at: new Date('2024-06-01T06:00:00.000Z'),
        clock_out_at: new Date('2024-06-01T15:00:00.000Z'),
        employee_name: 'Dana Cohen',
        employee_id: 'EMP001',
        correction_count: 2,
      },
    ]);

    const result = await getFlaggedSessions(5, UserRole.ADMIN);

    expect(repo.findFlaggedSessions).toHaveBeenCalledWith(undefined, undefined);
    expect(result.total).toBe(1);
    expect(result.sessions[0]).toMatchObject({
      timeEntryId: 42,
      employeeName: 'Dana Cohen',
      employeeId: 'EMP001',
      flagReason: 'AUTO_CLOSED_BREAK',
      correctionCount: 2,
    });
  });

  it('passes managerId to repo when requester is MANAGER', async () => {
    vi.mocked(repo.findFlaggedSessions).mockResolvedValue([]);

    await getFlaggedSessions(3, UserRole.MANAGER);

    expect(repo.findFlaggedSessions).toHaveBeenCalledWith(3, undefined);
  });

  it('passes employeeId filter alongside managerId for MANAGER', async () => {
    vi.mocked(repo.findFlaggedSessions).mockResolvedValue([]);

    await getFlaggedSessions(3, UserRole.MANAGER, 10);

    expect(repo.findFlaggedSessions).toHaveBeenCalledWith(3, 10);
  });

  it('passes only employeeId filter (no managerId) for ADMIN', async () => {
    vi.mocked(repo.findFlaggedSessions).mockResolvedValue([]);

    await getFlaggedSessions(5, UserRole.ADMIN, 10);

    expect(repo.findFlaggedSessions).toHaveBeenCalledWith(undefined, 10);
  });

  it('returns { sessions: [], total: 0 } when no flagged sessions', async () => {
    vi.mocked(repo.findFlaggedSessions).mockResolvedValue([]);

    const result = await getFlaggedSessions(5, UserRole.ADMIN);

    expect(result).toEqual({ sessions: [], total: 0 });
  });
});

// break_start_at = 13:00 Jerusalem = 10:00 UTC
// clock_out_at   = 17:00 Jerusalem = 14:00 UTC
const flaggedEntry = {
  id: 42,
  user_id: 10,
  clock_in_at: new Date('2024-06-01T06:00:00.000Z'),
  clock_out_at: new Date('2024-06-01T14:00:00.000Z'),
  is_flagged: 1,
  manager_id: 3,
  break_id: 7,
  break_start_at: new Date('2024-06-01T10:00:00.000Z'),
  break_end_at: null,
};

describe('reviewFlaggedSession', () => {
  it('throws NOT_FOUND when entry does not exist', async () => {
    vi.mocked(repo.findFlaggedEntryWithBreak).mockResolvedValue(undefined);

    await expect(
      reviewFlaggedSession(3, UserRole.MANAGER, 42, '14:00'),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('throws VALIDATION_ERROR when entry is not flagged', async () => {
    vi.mocked(repo.findFlaggedEntryWithBreak).mockResolvedValue({ ...flaggedEntry, is_flagged: 0 });

    await expect(
      reviewFlaggedSession(3, UserRole.MANAGER, 42, '14:00'),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws FORBIDDEN when MANAGER reviews entry from an employee not assigned to them', async () => {
    vi.mocked(repo.findFlaggedEntryWithBreak).mockResolvedValue({ ...flaggedEntry, manager_id: 99 });

    await expect(
      reviewFlaggedSession(3, UserRole.MANAGER, 42, '14:00'),
    ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN, statusCode: 403 });
  });

  it('throws NOT_FOUND when entry has no break', async () => {
    vi.mocked(repo.findFlaggedEntryWithBreak).mockResolvedValue({ ...flaggedEntry, break_start_at: null });

    await expect(
      reviewFlaggedSession(3, UserRole.MANAGER, 42, '14:00'),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('throws VALIDATION_ERROR when break end is before break start (12:00 Jerusalem = 09:00 UTC)', async () => {
    vi.mocked(repo.findFlaggedEntryWithBreak).mockResolvedValue(flaggedEntry);

    await expect(
      reviewFlaggedSession(3, UserRole.MANAGER, 42, '12:00'),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws VALIDATION_ERROR when break end is after clock-out (18:00 Jerusalem = 15:00 UTC, clock-out 14:00 UTC)', async () => {
    vi.mocked(repo.findFlaggedEntryWithBreak).mockResolvedValue(flaggedEntry);

    await expect(
      reviewFlaggedSession(3, UserRole.MANAGER, 42, '18:00'),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('calls updateFlaggedSessionReview with correct params on success', async () => {
    vi.mocked(repo.findFlaggedEntryWithBreak).mockResolvedValue(flaggedEntry);
    vi.mocked(repo.updateFlaggedSessionReview).mockResolvedValue(undefined);

    await reviewFlaggedSession(3, UserRole.MANAGER, 42, '14:00');

    expect(repo.updateFlaggedSessionReview).toHaveBeenCalledWith(
      expect.objectContaining({
        timeEntryId: 42,
        actorId: 3,
        targetUserId: 10,
      }),
    );
  });

  it('allows ADMIN to review entry regardless of manager_id', async () => {
    vi.mocked(repo.findFlaggedEntryWithBreak).mockResolvedValue({ ...flaggedEntry, manager_id: 99 });
    vi.mocked(repo.updateFlaggedSessionReview).mockResolvedValue(undefined);

    await expect(
      reviewFlaggedSession(5, UserRole.ADMIN, 42, '14:00'),
    ).resolves.toBeUndefined();
  });
});
