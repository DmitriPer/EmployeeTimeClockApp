import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, UserRole } from '@app/shared';
import { reviewForManager } from '../correction-requests.service.js';

vi.mock('../correction-requests.repository.js', () => ({
  findCorrectionRequestById: vi.fn(),
  findCorrectionRequestByEntryId: vi.fn(),
  findCorrectionRequestsByEntryIds: vi.fn(),
  findPendingCorrectionRequests: vi.fn(),
  insertCorrectionRequest: vi.fn(),
  updateCorrectionRequest: vi.fn(),
  deleteCorrectionRequest: vi.fn(),
  approveCorrection: vi.fn(),
  rejectCorrection: vi.fn(),
}));

vi.mock('../../users/users.repository.js', () => ({
  findUserById: vi.fn(),
}));

vi.mock('../../history/history.repository.js', () => ({
  findEntryById: vi.fn(),
}));

vi.mock('../../overtime/overtime.repository.js', () => ({
  insertOvertimeRequest: vi.fn(),
}));

vi.mock('../../db/connection.js', () => ({
  db: {
    transaction: vi.fn(() => ({ execute: vi.fn() })),
  },
}));

import * as repo from '../correction-requests.repository.js';

const now = new Date('2024-06-01T10:00:00.000Z');

const baseRequest = {
  id: 1,
  user_id: 10,
  time_entry_id: 42,
  status: 'PENDING' as const,
  requested_clock_in_at: new Date('2024-06-01T06:00:00.000Z'),
  requested_clock_out_at: new Date('2024-06-01T15:00:00.000Z'),
  requested_breaks_json: null,
  employee_note: 'Please fix',
  manager_note: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: now,
  updated_at: now,
};

beforeEach(() => vi.clearAllMocks());

const reviewParams = {
  requestId: 1,
  reviewerId: 5,
  reviewerRole: UserRole.ADMIN,
  action: 'APPROVED' as const,
  note: null,
};

describe('reviewForManager — lifecycle guards (via executeReview)', () => {
  it('throws OT_ALREADY_REVIEWED when request is APPROVED', async () => {
    vi.mocked(repo.findCorrectionRequestById).mockResolvedValue({ ...baseRequest, status: 'APPROVED' });

    await expect(reviewForManager(reviewParams)).rejects.toMatchObject({
      code: ErrorCode.OT_ALREADY_REVIEWED,
      statusCode: 409,
    });
  });

  it('throws OT_ALREADY_REVIEWED when request is REJECTED', async () => {
    vi.mocked(repo.findCorrectionRequestById).mockResolvedValue({ ...baseRequest, status: 'REJECTED' });

    await expect(reviewForManager(reviewParams)).rejects.toMatchObject({
      code: ErrorCode.OT_ALREADY_REVIEWED,
      statusCode: 409,
    });
  });

  it('throws CANNOT_SELF_APPROVE when reviewer owns the request', async () => {
    vi.mocked(repo.findCorrectionRequestById).mockResolvedValue(baseRequest); // user_id: 10

    await expect(reviewForManager({ ...reviewParams, reviewerId: 10 })).rejects.toMatchObject({
      code: ErrorCode.CANNOT_SELF_APPROVE,
      statusCode: 403,
    });
  });
});
