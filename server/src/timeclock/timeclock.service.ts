import { ClockStatus, ErrorCode } from '@app/shared';
import { db } from '../db/connection.js';
import { AppError } from '../lib/errors.js';
import * as repo from './timeclock.repository.js';

const PAID_BREAK_ALLOWANCE_MINUTES = 60;
const OVERTIME_THRESHOLD_MINUTES = 9 * 60;

export type ClockStatusResult = {
  status: ClockStatus;
  entryId?: number;
  clockInAt?: string;
  breakStartAt?: string | null;
  totalBreakMinutes: number;
  grossMinutes?: number;
};

export type ClockOutResult = {
  entryId: number;
  clockInAt: string;
  clockOutAt: string;
  grossMinutes: number;
  totalBreakMinutes: number;
  excessBreakMinutes: number;
  paidMinutes: number;
  isAutoClosedBreak: boolean;
  isFlagged: boolean;
  overtimeMinutes: number;
};

function sumClosedBreakMinutes(
  breaks: { break_start_at: Date; break_end_at: Date | null }[],
  until?: Date,
): number {
  return breaks.reduce((total, b) => {
    const end = b.break_end_at ?? until;
    if (!end) return total;
    return total + Math.floor((end.getTime() - b.break_start_at.getTime()) / 60_000);
  }, 0);
}

export async function getStatus(userId: number): Promise<ClockStatusResult> {
  const session = await repo.findOpenSession(userId);

  if (!session) {
    return { status: ClockStatus.NOT_CLOCKED_IN, totalBreakMinutes: 0 };
  }

  const breaks = await repo.findBreaksByEntryId(session.id);
  const openBreak = breaks.find((b) => b.break_end_at === null);
  const now = new Date();

  const totalBreakMinutes = sumClosedBreakMinutes(breaks) +
    (openBreak ? Math.floor((now.getTime() - openBreak.break_start_at.getTime()) / 60_000) : 0);

  const grossMinutes = Math.floor((now.getTime() - session.clock_in_at.getTime()) / 60_000);

  return {
    status: openBreak ? ClockStatus.ON_BREAK : ClockStatus.WORKING,
    entryId: session.id,
    clockInAt: session.clock_in_at.toISOString(),
    breakStartAt: openBreak ? openBreak.break_start_at.toISOString() : null,
    totalBreakMinutes,
    grossMinutes,
  };
}

export async function clockIn(userId: number): Promise<ClockStatusResult> {
  const existing = await repo.findOpenSession(userId);

  if (existing) {
    throw new AppError('You already have an open session.', 409, ErrorCode.SESSION_ALREADY_OPEN);
  }

  const now = new Date();
  const entryId = await repo.insertTimeEntry(userId, now);

  return {
    status: ClockStatus.WORKING,
    entryId,
    clockInAt: now.toISOString(),
    totalBreakMinutes: 0,
    grossMinutes: 0,
  };
}

export async function clockOut(userId: number): Promise<ClockOutResult> {
  const session = await repo.findOpenSession(userId);

  if (!session) {
    throw new AppError('No open session to clock out of.', 409, ErrorCode.NO_OPEN_SESSION);
  }

  const now = new Date();

  return db.transaction().execute(async (trx) => {
    const breaks = await repo.findBreaksByEntryIdTrx(trx, session.id);
    const openBreak = breaks.find((b) => b.break_end_at === null);

    let isAutoClosedBreak = false;
    if (openBreak) {
      await repo.closeBreakEvent(trx, openBreak.id, now);
      isAutoClosedBreak = true;
    }

    const allBreaks = breaks.map((b) =>
      b.id === openBreak?.id ? { ...b, break_end_at: now } : b,
    );
    const totalBreakMinutes = sumClosedBreakMinutes(allBreaks);
    const excessBreakMinutes = Math.max(0, totalBreakMinutes - PAID_BREAK_ALLOWANCE_MINUTES);
    const grossMinutes = Math.floor((now.getTime() - session.clock_in_at.getTime()) / 60_000);
    const paidMinutes = grossMinutes - excessBreakMinutes;

    const isFlagged = isAutoClosedBreak;
    await repo.closeTimeEntry(trx, session.id, now, isAutoClosedBreak, isFlagged);

    let overtimeMinutes = 0;
    if (grossMinutes > OVERTIME_THRESHOLD_MINUTES) {
      overtimeMinutes = grossMinutes - OVERTIME_THRESHOLD_MINUTES;
      await repo.insertOvertimeRequest(trx, {
        timeEntryId: session.id,
        userId,
        overtimeMinutes,
      });
    }

    return {
      entryId: session.id,
      clockInAt: session.clock_in_at.toISOString(),
      clockOutAt: now.toISOString(),
      grossMinutes,
      totalBreakMinutes,
      excessBreakMinutes,
      paidMinutes,
      isAutoClosedBreak,
      isFlagged,
      overtimeMinutes,
    };
  });
}

export async function startBreak(userId: number): Promise<ClockStatusResult> {
  const session = await repo.findOpenSession(userId);

  if (!session) {
    throw new AppError('No open session to start a break.', 409, ErrorCode.NO_OPEN_SESSION);
  }

  const openBreak = await repo.findOpenBreak(session.id);
  if (openBreak) {
    throw new AppError('A break is already in progress.', 409, ErrorCode.BREAK_ALREADY_OPEN);
  }

  const now = new Date();
  await repo.insertBreakEvent(session.id, now);

  const breaks = await repo.findBreaksByEntryId(session.id);
  const totalBreakMinutes = sumClosedBreakMinutes(breaks);
  const grossMinutes = Math.floor((now.getTime() - session.clock_in_at.getTime()) / 60_000);

  return {
    status: ClockStatus.ON_BREAK,
    entryId: session.id,
    clockInAt: session.clock_in_at.toISOString(),
    breakStartAt: now.toISOString(),
    totalBreakMinutes,
    grossMinutes,
  };
}

export async function endBreak(userId: number): Promise<ClockStatusResult> {
  const session = await repo.findOpenSession(userId);

  if (!session) {
    throw new AppError('No open session.', 409, ErrorCode.NO_OPEN_SESSION);
  }

  const openBreak = await repo.findOpenBreak(session.id);
  if (!openBreak) {
    throw new AppError('No break in progress.', 409, ErrorCode.NO_OPEN_BREAK);
  }

  const now = new Date();

  await db
    .updateTable('break_events')
    .set({ break_end_at: now })
    .where('id', '=', openBreak.id)
    .execute();

  const breaks = await repo.findBreaksByEntryId(session.id);
  const totalBreakMinutes = sumClosedBreakMinutes(breaks);
  const grossMinutes = Math.floor((now.getTime() - session.clock_in_at.getTime()) / 60_000);

  return {
    status: ClockStatus.WORKING,
    entryId: session.id,
    clockInAt: session.clock_in_at.toISOString(),
    totalBreakMinutes,
    grossMinutes,
  };
}
