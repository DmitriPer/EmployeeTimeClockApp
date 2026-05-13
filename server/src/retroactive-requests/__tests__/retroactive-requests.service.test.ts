import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode } from '@app/shared';
import {
  submitRetroactiveRequest,
  deleteRetroactiveRequest,
  reviewRetroactiveRequest,
} from '../retroactive-requests.service.js';

vi.mock('../retroactive-requests.repository.js', () => ({
  findPendingRetroactiveRequestByUserId: vi.fn(),
  findRetroactiveRequestById: vi.fn(),
  findRetroactiveRequestsByUserId: vi.fn(),
  insertRetroactiveRequest: vi.fn(),
  deleteRetroactiveRequest: vi.fn(),
  findPendingRetroactiveRequests: vi.fn(),
  rejectRetroactiveRequest: vi.fn(),
}));

vi.mock('../../utils/periodLock.js', () => ({
  isCurrentMonth: vi.fn(),
  isCurrentMonthDate: vi.fn(),
}));

const mockDbExecuteTakeFirst = vi.hoisted(() => vi.fn());

vi.mock('../../db/connection.js', () => ({
  db: {
    selectFrom: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: mockDbExecuteTakeFirst,
    })),
    transaction: vi.fn(() => ({
      execute: vi.fn(async (fn: (trx: unknown) => Promise<unknown>) => {
        const trx = {
          insertInto: vi.fn(() => ({
            values: vi.fn(() => ({
              executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: BigInt(99) }),
              execute: vi.fn().mockResolvedValue([]),
            })),
          })),
          updateTable: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => ({ execute: vi.fn() })),
            })),
          })),
        };
        return fn(trx);
      }),
    })),
  },
}));

import * as repo from '../retroactive-requests.repository.js';
import * as periodLock from '../../utils/periodLock.js';

const NOW = new Date('2024-06-15T10:00:00.000Z');

const pendingRow = {
  id: 1,
  user_id: 10,
  requested_date: '2024-06-10',
  clock_in_time: '08:00',
  clock_out_time: '17:00',
  breaks_json: null,
  employee_note: 'Forgot to log',
  status: 'PENDING' as const,
  reviewed_by: null,
  reviewed_at: null,
  manager_note: null,
  created_at: NOW,
};

const approvedRow = { ...pendingRow, status: 'APPROVED' as const };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(periodLock.isCurrentMonthDate).mockReturnValue(true);
  mockDbExecuteTakeFirst.mockResolvedValue(undefined);
});

const validParams = {
  date: '2024-06-10',
  clockInTime: '08:00',
  clockOutTime: '17:00',
  employeeNote: 'Forgot to log in the morning',
};

describe('submitRetroactiveRequest', () => {
  it('throws VALIDATION_ERROR when employeeNote is empty', async () => {
    await expect(
      submitRetroactiveRequest(10, { ...validParams, employeeNote: '  ' }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws PERIOD_LOCKED when date is outside current month', async () => {
    vi.mocked(periodLock.isCurrentMonthDate).mockReturnValue(false);

    await expect(submitRetroactiveRequest(10, validParams)).rejects.toMatchObject({
      code: ErrorCode.PERIOD_LOCKED,
    });
  });

  it('throws VALIDATION_ERROR when clockOut is not after clockIn', async () => {
    await expect(
      submitRetroactiveRequest(10, { ...validParams, clockInTime: '17:00', clockOutTime: '08:00' }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws VALIDATION_ERROR when break end is before break start', async () => {
    await expect(
      submitRetroactiveRequest(10, {
        ...validParams,
        breaks: [{ start: '13:00', end: '12:00' }],
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws VALIDATION_ERROR when break falls outside shift', async () => {
    await expect(
      submitRetroactiveRequest(10, {
        ...validParams,
        breaks: [{ start: '07:00', end: '08:30' }],
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws ENTRY_ALREADY_EXISTS when an entry exists for that date', async () => {
    mockDbExecuteTakeFirst.mockResolvedValueOnce({ id: 42 });

    await expect(submitRetroactiveRequest(10, validParams)).rejects.toMatchObject({
      code: ErrorCode.ENTRY_ALREADY_EXISTS,
    });
  });

  it('throws RETROACTIVE_REQUEST_PENDING when employee already has a pending request', async () => {
    vi.mocked(repo.findPendingRetroactiveRequestByUserId).mockResolvedValue(pendingRow);

    await expect(submitRetroactiveRequest(10, validParams)).rejects.toMatchObject({
      code: ErrorCode.RETROACTIVE_REQUEST_PENDING,
    });
  });

  it('inserts and returns the new request on success', async () => {
    vi.mocked(repo.findPendingRetroactiveRequestByUserId).mockResolvedValue(undefined);
    vi.mocked(repo.insertRetroactiveRequest).mockResolvedValue(1);
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(pendingRow);

    const result = await submitRetroactiveRequest(10, validParams);

    expect(repo.insertRetroactiveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        requestedDate: '2024-06-10',
        clockInTime: '08:00',
        clockOutTime: '17:00',
      }),
    );
    expect(result).toMatchObject({ id: 1, status: 'PENDING', date: '2024-06-10' });
  });
});

describe('deleteRetroactiveRequest', () => {
  it('throws NOT_FOUND when request does not exist', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(undefined);

    await expect(deleteRetroactiveRequest(10, 1)).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });

  it('throws FORBIDDEN when requester does not own the request', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue({ ...pendingRow, user_id: 99 });

    await expect(deleteRetroactiveRequest(10, 1)).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
  });

  it('throws OT_ALREADY_REVIEWED when request is not PENDING', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(approvedRow);

    await expect(deleteRetroactiveRequest(10, 1)).rejects.toMatchObject({
      code: ErrorCode.OT_ALREADY_REVIEWED,
    });
  });

  it('deletes the request on success', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(pendingRow);
    vi.mocked(repo.deleteRetroactiveRequest).mockResolvedValue(undefined);

    await deleteRetroactiveRequest(10, 1);

    expect(repo.deleteRetroactiveRequest).toHaveBeenCalledWith(1);
  });
});

describe('reviewRetroactiveRequest', () => {
  it('throws NOT_FOUND when request does not exist', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(undefined);

    await expect(reviewRetroactiveRequest(5, 1, 'APPROVED', null)).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });

  it('throws OT_ALREADY_REVIEWED when request is not PENDING', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(approvedRow);

    await expect(reviewRetroactiveRequest(5, 1, 'APPROVED', null)).rejects.toMatchObject({
      code: ErrorCode.OT_ALREADY_REVIEWED,
    });
  });

  it('throws CANNOT_SELF_APPROVE when reviewer is the requester', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(pendingRow);

    await expect(reviewRetroactiveRequest(10, 1, 'APPROVED', null)).rejects.toMatchObject({
      code: ErrorCode.CANNOT_SELF_APPROVE,
    });
  });

  it('rejects the request without creating a time entry', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(pendingRow);
    vi.mocked(repo.rejectRetroactiveRequest).mockResolvedValue(undefined);

    const result = await reviewRetroactiveRequest(5, 1, 'REJECTED', 'Not enough detail');

    expect(repo.rejectRetroactiveRequest).toHaveBeenCalledWith(1, 5, 'Not enough detail');
    expect(result).toMatchObject({ id: 1, status: 'REJECTED' });
    expect(result).not.toHaveProperty('timeEntryId');
  });

  it('approves the request and returns timeEntryId from transaction', async () => {
    vi.mocked(repo.findRetroactiveRequestById).mockResolvedValue(pendingRow);

    const result = await reviewRetroactiveRequest(5, 1, 'APPROVED', null);

    expect(result).toMatchObject({ id: 1, status: 'APPROVED', timeEntryId: 99 });
  });
});
