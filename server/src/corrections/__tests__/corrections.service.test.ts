import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode } from '@app/shared';
import { correctTimeEntry, getAuditLog } from '../corrections.service.js';

vi.mock('../corrections.repository.js', () => ({
  findTimeEntryById: vi.fn(),
  findLastBreakByEntryId: vi.fn(),
  updateTimeEntryField: vi.fn(),
  updateBreakEndAt: vi.fn(),
  insertAuditLog: vi.fn(),
  findAuditLogByEntryId: vi.fn(),
}));

vi.mock('../../db/connection.js', () => ({
  db: {
    transaction: vi.fn(() => ({
      execute: vi.fn(async (fn: (trx: unknown) => Promise<unknown>) => fn({})),
    })),
  },
}));

import * as repo from '../corrections.repository.js';

const clockInAt = new Date('2024-06-01T07:00:00.000Z');
const clockOutAt = new Date('2024-06-01T16:00:00.000Z');

const openEntry = {
  id: 1,
  user_id: 5,
  clock_in_at: clockInAt,
  clock_out_at: clockOutAt,
  is_auto_closed_break: 0,
  is_flagged: 1,
  is_retroactive: 0,
  employee_note: null,
  created_at: clockInAt,
};

const breakEvent = {
  id: 10,
  time_entry_id: 1,
  break_start_at: new Date('2024-06-01T12:00:00.000Z'),
  break_end_at: new Date('2024-06-01T12:30:00.000Z'),
};

beforeEach(() => vi.clearAllMocks());

describe('correctTimeEntry', () => {
  it('throws NOT_FOUND when time entry does not exist', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(undefined);

    await expect(
      correctTimeEntry(99, 1, { field: 'clock_in_at', value: '2024-06-01T06:00:00.000Z' }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('corrects clock_in_at and returns audit data', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(openEntry);
    vi.mocked(repo.updateTimeEntryField).mockResolvedValue(undefined);
    vi.mocked(repo.insertAuditLog).mockResolvedValue(42);

    const result = await correctTimeEntry(1, 2, {
      field: 'clock_in_at',
      value: '2024-06-01T06:00:00.000Z',
    });

    expect(repo.updateTimeEntryField).toHaveBeenCalledWith(
      {},
      1,
      'clock_in_at',
      new Date('2024-06-01T06:00:00.000Z'),
    );
    expect(result).toMatchObject({
      timeEntryId: 1,
      field: 'clock_in_at',
      oldValue: clockInAt.toISOString(),
      newValue: '2024-06-01T06:00:00.000Z',
      auditId: 42,
    });
  });

  it('throws VALIDATION_ERROR when clock_out_at is before clock_in_at', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(openEntry);

    await expect(
      correctTimeEntry(1, 2, { field: 'clock_out_at', value: '2024-06-01T06:00:00.000Z' }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR, statusCode: 400 });
  });

  it('corrects clock_out_at when valid', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(openEntry);
    vi.mocked(repo.updateTimeEntryField).mockResolvedValue(undefined);
    vi.mocked(repo.insertAuditLog).mockResolvedValue(43);

    const result = await correctTimeEntry(1, 2, {
      field: 'clock_out_at',
      value: '2024-06-01T17:00:00.000Z',
    });

    expect(result).toMatchObject({
      field: 'clock_out_at',
      oldValue: clockOutAt.toISOString(),
      auditId: 43,
    });
  });

  it('corrects break_end_at using the last break event', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(openEntry);
    vi.mocked(repo.findLastBreakByEntryId).mockResolvedValue(breakEvent);
    vi.mocked(repo.updateBreakEndAt).mockResolvedValue(undefined);
    vi.mocked(repo.insertAuditLog).mockResolvedValue(44);

    const result = await correctTimeEntry(1, 2, {
      field: 'break_end_at',
      value: '2024-06-01T12:45:00.000Z',
    });

    expect(repo.updateBreakEndAt).toHaveBeenCalledWith(
      {},
      10,
      new Date('2024-06-01T12:45:00.000Z'),
    );
    expect(result).toMatchObject({
      field: 'break_end_at',
      oldValue: breakEvent.break_end_at!.toISOString(),
      auditId: 44,
    });
  });

  it('throws NOT_FOUND for break_end_at when no break exists', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(openEntry);
    vi.mocked(repo.findLastBreakByEntryId).mockResolvedValue(undefined);

    await expect(
      correctTimeEntry(1, 2, { field: 'break_end_at', value: '2024-06-01T12:45:00.000Z' }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });
});

describe('getAuditLog', () => {
  it('throws NOT_FOUND when time entry does not exist', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(undefined);

    await expect(getAuditLog(99)).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('returns empty entries when no audit log rows exist', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(openEntry);
    vi.mocked(repo.findAuditLogByEntryId).mockResolvedValue([]);

    const result = await getAuditLog(1);

    expect(result).toEqual({ entries: [] });
  });

  it('returns mapped audit log entries ordered by createdAt', async () => {
    vi.mocked(repo.findTimeEntryById).mockResolvedValue(openEntry);
    vi.mocked(repo.findAuditLogByEntryId).mockResolvedValue([
      {
        id: 1,
        field_name: 'clock_in_at',
        old_value: '2024-06-01T07:00:00.000Z',
        new_value: '2024-06-01T06:00:00.000Z',
        created_at: new Date('2024-06-01T18:00:00.000Z'),
        actor_name: 'Manager One',
      },
    ]);

    const result = await getAuditLog(1);

    expect(result.entries[0]).toMatchObject({
      id: 1,
      actorName: 'Manager One',
      field: 'clock_in_at',
      oldValue: '2024-06-01T07:00:00.000Z',
      newValue: '2024-06-01T06:00:00.000Z',
    });
  });
});
