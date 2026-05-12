import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, UserRole } from '@app/shared';
import { getHistory, updateNote } from '../history.service.js';

vi.mock('../history.repository.js', () => ({
  findEntriesForUser: vi.fn(),
  findBreaksByEntryIds: vi.fn(),
  findOvertimeByEntryIds: vi.fn(),
  findCorrectedEntryIds: vi.fn(),
  findEntryById: vi.fn(),
  updateEntryNote: vi.fn(),
}));

vi.mock('../../correction-requests/correction-requests.repository.js', () => ({
  findCorrectionRequestsByEntryIds: vi.fn(),
}));

import * as repo from '../history.repository.js';
import * as correctionRepo from '../../correction-requests/correction-requests.repository.js';

const clockIn = new Date('2024-06-01T06:00:00.000Z');
const clockOut = new Date('2024-06-01T15:30:00.000Z'); // 9.5h gross

const entry = {
  id: 1,
  user_id: 10,
  clock_in_at: clockIn,
  clock_out_at: clockOut,
  is_auto_closed_break: 0,
  is_flagged: 0,
  is_retroactive: 0,
  employee_note: null,
  created_at: clockIn,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.findCorrectedEntryIds).mockResolvedValue([]);
  vi.mocked(correctionRepo.findCorrectionRequestsByEntryIds).mockResolvedValue([]);
});

describe('getHistory', () => {
  it('returns empty array when no entries exist', async () => {
    vi.mocked(repo.findEntriesForUser).mockResolvedValue([]);

    const result = await getHistory({ requesterId: 10, requesterRole: UserRole.EMPLOYEE });

    expect(result).toEqual([]);
    expect(repo.findBreaksByEntryIds).not.toHaveBeenCalled();
  });

  it('uses requesterId for EMPLOYEE regardless of targetUserId param', async () => {
    vi.mocked(repo.findEntriesForUser).mockResolvedValue([]);

    await getHistory({
      requesterId: 10,
      requesterRole: UserRole.EMPLOYEE,
      targetUserId: 99,
    });

    expect(repo.findEntriesForUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 10 }),
    );
  });

  it('uses targetUserId for MANAGER when provided', async () => {
    vi.mocked(repo.findEntriesForUser).mockResolvedValue([]);

    await getHistory({
      requesterId: 5,
      requesterRole: UserRole.MANAGER,
      targetUserId: 99,
    });

    expect(repo.findEntriesForUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 99 }),
    );
  });

  it('calculates grossMinutes, totalBreakMinutes, paidMinutes correctly', async () => {
    vi.mocked(repo.findEntriesForUser).mockResolvedValue([entry]);
    vi.mocked(repo.findBreaksByEntryIds).mockResolvedValue([
      {
        id: 1,
        time_entry_id: 1,
        break_start_at: new Date('2024-06-01T09:00:00.000Z'),
        break_end_at: new Date('2024-06-01T09:30:00.000Z'),
      },
    ]);
    vi.mocked(repo.findOvertimeByEntryIds).mockResolvedValue([]);

    const [result] = await getHistory({ requesterId: 10, requesterRole: UserRole.EMPLOYEE });

    expect(result.grossMinutes).toBe(570); // 9.5h
    expect(result.totalBreakMinutes).toBe(30);
    expect(result.excessBreakMinutes).toBe(0);
    expect(result.paidMinutes).toBe(570); // no excess
  });

  it('deducts excess break from paidMinutes', async () => {
    vi.mocked(repo.findEntriesForUser).mockResolvedValue([entry]);
    vi.mocked(repo.findBreaksByEntryIds).mockResolvedValue([
      {
        id: 1,
        time_entry_id: 1,
        break_start_at: new Date('2024-06-01T09:00:00.000Z'),
        break_end_at: new Date('2024-06-01T10:30:00.000Z'), // 90 min
      },
    ]);
    vi.mocked(repo.findOvertimeByEntryIds).mockResolvedValue([]);

    const [result] = await getHistory({ requesterId: 10, requesterRole: UserRole.EMPLOYEE });

    expect(result.totalBreakMinutes).toBe(90);
    expect(result.excessBreakMinutes).toBe(30);
    expect(result.paidMinutes).toBe(540); // 570 - 30
  });

  it('includes overtime request when present', async () => {
    vi.mocked(repo.findEntriesForUser).mockResolvedValue([entry]);
    vi.mocked(repo.findBreaksByEntryIds).mockResolvedValue([]);
    vi.mocked(repo.findOvertimeByEntryIds).mockResolvedValue([
      {
        id: 7,
        time_entry_id: 1,
        user_id: 10,
        status: 'PENDING',
        overtime_minutes: 30,
        manager_note: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: clockIn,
      },
    ]);

    const [result] = await getHistory({ requesterId: 10, requesterRole: UserRole.EMPLOYEE });

    expect(result.overtimeRequest).toEqual({ id: 7, status: 'PENDING', overtimeMinutes: 30 });
  });

  it('returns null clockOutAt for open sessions', async () => {
    vi.mocked(repo.findEntriesForUser).mockResolvedValue([
      { ...entry, clock_out_at: null },
    ]);
    vi.mocked(repo.findBreaksByEntryIds).mockResolvedValue([]);
    vi.mocked(repo.findOvertimeByEntryIds).mockResolvedValue([]);

    const [result] = await getHistory({ requesterId: 10, requesterRole: UserRole.EMPLOYEE });

    expect(result.clockOutAt).toBeNull();
    expect(result.grossMinutes).toBeNull();
    expect(result.paidMinutes).toBeNull();
  });
});

describe('updateNote', () => {
  it('throws NOT_FOUND when entry does not exist', async () => {
    vi.mocked(repo.findEntryById).mockResolvedValue(undefined);

    await expect(
      updateNote({ requesterId: 10, entryId: 999, note: 'hello' }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('throws FORBIDDEN when entry belongs to another user', async () => {
    vi.mocked(repo.findEntryById).mockResolvedValue({ ...entry, user_id: 99 });

    await expect(
      updateNote({ requesterId: 10, entryId: 1, note: 'hello' }),
    ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });
  });

  it('updates the note when the entry belongs to the requester', async () => {
    vi.mocked(repo.findEntryById).mockResolvedValue(entry);
    vi.mocked(repo.updateEntryNote).mockResolvedValue(undefined);

    await updateNote({ requesterId: 10, entryId: 1, note: 'Worked late on project' });

    expect(repo.updateEntryNote).toHaveBeenCalledWith(1, 'Worked late on project');
  });
});
