import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClockStatus, ErrorCode } from '@app/shared';
import { getStatus, clockIn, clockOut, startBreak, endBreak } from '../timeclock.service.js';

vi.mock('../timeclock.repository.js', () => ({
  findOpenSession: vi.fn(),
  insertTimeEntry: vi.fn(),
  closeTimeEntry: vi.fn(),
  findOpenBreak: vi.fn(),
  insertBreakEvent: vi.fn(),
  closeBreakEvent: vi.fn(),
  findBreaksByEntryId: vi.fn(),
  findBreaksByEntryIdTrx: vi.fn(),
  insertOvertimeRequest: vi.fn(),
}));

vi.mock('../../db/connection.js', () => ({
  db: {
    transaction: vi.fn(() => ({
      execute: vi.fn(async (fn: (trx: unknown) => Promise<unknown>) => fn({})),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: vi.fn(),
        })),
      })),
    })),
  },
}));

import * as repo from '../timeclock.repository.js';

const clockInAt = new Date('2024-06-01T07:00:00.000Z');

const openSession = {
  id: 42,
  user_id: 1,
  clock_in_at: clockInAt,
  clock_out_at: null,
  is_auto_closed_break: 0,
  is_flagged: 0,
  is_retroactive: 0,
  employee_note: null,
  created_at: clockInAt,
};

beforeEach(() => vi.clearAllMocks());

describe('getStatus', () => {
  it('returns NOT_CLOCKED_IN when no open session', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(undefined);

    const result = await getStatus(1);

    expect(result.status).toBe(ClockStatus.NOT_CLOCKED_IN);
    expect(result.totalBreakMinutes).toBe(0);
  });

  it('returns WORKING when session exists and no open break', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);
    vi.mocked(repo.findBreaksByEntryId).mockResolvedValue([]);

    const result = await getStatus(1);

    expect(result.status).toBe(ClockStatus.WORKING);
    expect(result.entryId).toBe(42);
    expect(result.clockInAt).toBe(clockInAt.toISOString());
    expect(result.totalBreakMinutes).toBe(0);
  });

  it('returns ON_BREAK when session exists and break is open', async () => {
    const breakStart = new Date('2024-06-01T09:00:00.000Z');
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);
    vi.mocked(repo.findBreaksByEntryId).mockResolvedValue([
      { id: 10, time_entry_id: 42, break_start_at: breakStart, break_end_at: null },
    ]);

    const result = await getStatus(1);

    expect(result.status).toBe(ClockStatus.ON_BREAK);
    expect(result.breakStartAt).toBe(breakStart.toISOString());
  });
});

describe('clockIn', () => {
  it('throws SESSION_ALREADY_OPEN when an open session exists', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);

    await expect(clockIn(1)).rejects.toMatchObject({ code: ErrorCode.SESSION_ALREADY_OPEN });
  });

  it('creates a new session and returns WORKING status', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(undefined);
    vi.mocked(repo.insertTimeEntry).mockResolvedValue(42);

    const result = await clockIn(1);

    expect(result.status).toBe(ClockStatus.WORKING);
    expect(result.entryId).toBe(42);
    expect(result.totalBreakMinutes).toBe(0);
    expect(repo.insertTimeEntry).toHaveBeenCalledWith(1, expect.any(Date));
  });
});

describe('clockOut', () => {
  it('throws NO_OPEN_SESSION when no session exists', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(undefined);

    await expect(clockOut(1)).rejects.toMatchObject({ code: ErrorCode.NO_OPEN_SESSION });
  });

  it('closes session normally when no open break', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);
    vi.mocked(repo.findBreaksByEntryIdTrx).mockResolvedValue([
      {
        id: 10,
        time_entry_id: 42,
        break_start_at: new Date('2024-06-01T09:00:00.000Z'),
        break_end_at: new Date('2024-06-01T09:30:00.000Z'),
      },
    ]);
    vi.mocked(repo.closeTimeEntry).mockResolvedValue(undefined);
    vi.mocked(repo.insertOvertimeRequest).mockResolvedValue(undefined);

    const result = await clockOut(1);

    expect(result.isAutoClosedBreak).toBe(false);
    expect(result.isFlagged).toBe(false);
    expect(result.totalBreakMinutes).toBe(30);
    expect(result.excessBreakMinutes).toBe(0);
    expect(repo.closeBreakEvent).not.toHaveBeenCalled();
  });

  it('auto-closes open break on clock-out and flags session', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);
    const openBreak = {
      id: 10,
      time_entry_id: 42,
      break_start_at: new Date('2024-06-01T09:00:00.000Z'),
      break_end_at: null,
    };
    vi.mocked(repo.findBreaksByEntryIdTrx).mockResolvedValue([openBreak]);
    vi.mocked(repo.closeBreakEvent).mockResolvedValue(undefined);
    vi.mocked(repo.closeTimeEntry).mockResolvedValue(undefined);
    vi.mocked(repo.insertOvertimeRequest).mockResolvedValue(undefined);

    const result = await clockOut(1);

    expect(result.isAutoClosedBreak).toBe(true);
    expect(result.isFlagged).toBe(true);
    expect(repo.closeBreakEvent).toHaveBeenCalledWith({}, 10, expect.any(Date));
  });

  it('creates overtime request when gross time exceeds 9 hours', async () => {
    const earlyClockIn = new Date(Date.now() - 10 * 60 * 60 * 1000); // 10h ago
    vi.mocked(repo.findOpenSession).mockResolvedValue({
      ...openSession,
      clock_in_at: earlyClockIn,
    });
    vi.mocked(repo.findBreaksByEntryIdTrx).mockResolvedValue([]);
    vi.mocked(repo.closeTimeEntry).mockResolvedValue(undefined);
    vi.mocked(repo.insertOvertimeRequest).mockResolvedValue(undefined);

    const result = await clockOut(1);

    expect(result.overtimeMinutes).toBeGreaterThan(0);
    expect(repo.insertOvertimeRequest).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ userId: 1, timeEntryId: 42 }),
    );
  });

  it('calculates excess break deduction correctly', async () => {
    const sessionStart = new Date('2024-06-01T07:00:00.000Z');
    vi.mocked(repo.findOpenSession).mockResolvedValue({
      ...openSession,
      clock_in_at: sessionStart,
    });
    vi.mocked(repo.findBreaksByEntryIdTrx).mockResolvedValue([
      {
        id: 10,
        time_entry_id: 42,
        break_start_at: new Date('2024-06-01T09:00:00.000Z'),
        break_end_at: new Date('2024-06-01T10:30:00.000Z'), // 90 min break
      },
    ]);
    vi.mocked(repo.closeTimeEntry).mockResolvedValue(undefined);
    vi.mocked(repo.insertOvertimeRequest).mockResolvedValue(undefined);

    const result = await clockOut(1);

    expect(result.totalBreakMinutes).toBe(90);
    expect(result.excessBreakMinutes).toBe(30);
    expect(result.paidMinutes).toBe(result.grossMinutes - 30);
  });
});

describe('startBreak', () => {
  it('throws NO_OPEN_SESSION when not clocked in', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(undefined);

    await expect(startBreak(1)).rejects.toMatchObject({ code: ErrorCode.NO_OPEN_SESSION });
  });

  it('throws BREAK_ALREADY_OPEN when break is in progress', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);
    vi.mocked(repo.findOpenBreak).mockResolvedValue({
      id: 10,
      time_entry_id: 42,
      break_start_at: new Date(),
      break_end_at: null,
    });

    await expect(startBreak(1)).rejects.toMatchObject({ code: ErrorCode.BREAK_ALREADY_OPEN });
  });

  it('inserts break event and returns ON_BREAK status', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);
    vi.mocked(repo.findOpenBreak).mockResolvedValue(undefined);
    vi.mocked(repo.insertBreakEvent).mockResolvedValue(10);
    vi.mocked(repo.findBreaksByEntryId).mockResolvedValue([]);

    const result = await startBreak(1);

    expect(result.status).toBe(ClockStatus.ON_BREAK);
    expect(repo.insertBreakEvent).toHaveBeenCalledWith(42, expect.any(Date));
  });
});

describe('endBreak', () => {
  it('throws NO_OPEN_SESSION when not clocked in', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(undefined);

    await expect(endBreak(1)).rejects.toMatchObject({ code: ErrorCode.NO_OPEN_SESSION });
  });

  it('throws NO_OPEN_BREAK when no break in progress', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);
    vi.mocked(repo.findOpenBreak).mockResolvedValue(undefined);

    await expect(endBreak(1)).rejects.toMatchObject({ code: ErrorCode.NO_OPEN_BREAK });
  });

  it('closes break and returns WORKING status', async () => {
    vi.mocked(repo.findOpenSession).mockResolvedValue(openSession);
    vi.mocked(repo.findOpenBreak).mockResolvedValue({
      id: 10,
      time_entry_id: 42,
      break_start_at: new Date('2024-06-01T09:00:00.000Z'),
      break_end_at: null,
    });
    vi.mocked(repo.findBreaksByEntryId).mockResolvedValue([
      {
        id: 10,
        time_entry_id: 42,
        break_start_at: new Date('2024-06-01T09:00:00.000Z'),
        break_end_at: new Date('2024-06-01T09:30:00.000Z'),
      },
    ]);

    const result = await endBreak(1);

    expect(result.status).toBe(ClockStatus.WORKING);
    expect(result.totalBreakMinutes).toBe(30);
  });
});
