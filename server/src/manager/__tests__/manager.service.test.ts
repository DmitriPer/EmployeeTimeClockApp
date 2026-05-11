import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode } from '@app/shared';
import { getPendingOvertimeRequests, reviewOvertimeRequest, getFlaggedSessions } from '../manager.service.js';

vi.mock('../manager.repository.js', () => ({
  findPendingOvertimeRequests: vi.fn(),
  findOvertimeRequestById: vi.fn(),
  updateOvertimeRequest: vi.fn(),
  findFlaggedSessions: vi.fn(),
}));

import * as repo from '../manager.repository.js';

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

beforeEach(() => vi.clearAllMocks());

describe('getPendingOvertimeRequests', () => {
  it('returns mapped overtime requests', async () => {
    vi.mocked(repo.findPendingOvertimeRequests).mockResolvedValue([pendingOtRow]);

    const result = await getPendingOvertimeRequests();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      overtimeMinutes: 30,
      status: 'PENDING',
      employeeName: 'Dana Cohen',
      employeeId: 'EMP001',
    });
  });

  it('returns empty array when no pending requests', async () => {
    vi.mocked(repo.findPendingOvertimeRequests).mockResolvedValue([]);

    const result = await getPendingOvertimeRequests();

    expect(result).toEqual([]);
  });
});

describe('reviewOvertimeRequest', () => {
  it('throws NOT_FOUND when request does not exist', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue(undefined);

    await expect(
      reviewOvertimeRequest({ requestId: 99, reviewerId: 5, action: 'APPROVED', note: null }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('throws OT_ALREADY_REVIEWED when status is not PENDING', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue({
      ...pendingOtRow,
      status: 'APPROVED' as const,
    });

    await expect(
      reviewOvertimeRequest({ requestId: 1, reviewerId: 5, action: 'REJECTED', note: null }),
    ).rejects.toMatchObject({ code: ErrorCode.OT_ALREADY_REVIEWED });
  });

  it('calls updateOvertimeRequest with correct params on approval', async () => {
    vi.mocked(repo.findOvertimeRequestById).mockResolvedValue(pendingOtRow);
    vi.mocked(repo.updateOvertimeRequest).mockResolvedValue(undefined);

    await reviewOvertimeRequest({
      requestId: 1,
      reviewerId: 5,
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

    await reviewOvertimeRequest({ requestId: 1, reviewerId: 5, action: 'REJECTED', note: null });

    expect(repo.updateOvertimeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REJECTED' }),
    );
  });
});

describe('getFlaggedSessions', () => {
  it('returns { sessions, total } with correct shape', async () => {
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

    const result = await getFlaggedSessions();

    expect(result.total).toBe(1);
    expect(result.sessions[0]).toMatchObject({
      timeEntryId: 42,
      employeeName: 'Dana Cohen',
      employeeId: 'EMP001',
      flagReason: 'AUTO_CLOSED_BREAK',
      correctionCount: 2,
    });
  });

  it('passes userId filter to repository', async () => {
    vi.mocked(repo.findFlaggedSessions).mockResolvedValue([]);

    await getFlaggedSessions(10);

    expect(repo.findFlaggedSessions).toHaveBeenCalledWith(10);
  });

  it('returns { sessions: [], total: 0 } when no flagged sessions', async () => {
    vi.mocked(repo.findFlaggedSessions).mockResolvedValue([]);

    const result = await getFlaggedSessions();

    expect(result).toEqual({ sessions: [], total: 0 });
  });
});
