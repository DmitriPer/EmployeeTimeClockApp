import { DateTime } from 'luxon';
import { ErrorCode, UserRole } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { calcPaidHours } from '../utils/timeCalculations.js';
import * as repo from './history.repository.js';
import { findCorrectionRequestsByEntryIds } from '../correction-requests/correction-requests.repository.js';

const TZ = 'Asia/Jerusalem';
const BREAK_ALLOWANCE_MINUTES = 60;

export interface BreakRecord {
  id: number;
  breakStartAt: string;
  breakEndAt: string | null;
  durationMinutes: number | null;
}

export interface OvertimeRecord {
  id: number;
  status: string;
  overtimeMinutes: number;
}

export interface PendingCorrectionRecord {
  id: number;
  requestedClockInAt: string;
  requestedClockOutAt: string | null;
  employeeNote: string;
}

export interface HistoryEntry {
  id: number;
  clockInAt: string;
  clockOutAt: string | null;
  grossMinutes: number | null;
  totalBreakMinutes: number;
  excessBreakMinutes: number;
  paidMinutes: number | null;
  isAutoClosedBreak: boolean;
  isFlagged: boolean;
  isCorrected: boolean;
  isRetroactive: boolean;
  employeeNote: string | null;
  breaks: BreakRecord[];
  overtimeRequest: OvertimeRecord | null;
  pendingCorrection: PendingCorrectionRecord | null;
}

function parseRangeDate(dateStr: string, boundary: 'start' | 'end'): Date {
  const dt = DateTime.fromISO(dateStr, { zone: TZ });
  return (boundary === 'start' ? dt.startOf('day') : dt.endOf('day')).toUTC().toJSDate();
}

function sumBreakMinutes(
  breaks: { break_start_at: Date; break_end_at: Date | null }[],
): number {
  return breaks.reduce((total, b) => {
    if (!b.break_end_at) return total;
    return total + Math.floor((b.break_end_at.getTime() - b.break_start_at.getTime()) / 60_000);
  }, 0);
}

export async function getHistory(params: {
  requesterId: number;
  requesterRole: UserRole;
  targetUserId?: number;
  from?: string;
  to?: string;
}): Promise<HistoryEntry[]> {
  const isPrivileged =
    params.requesterRole === UserRole.MANAGER || params.requesterRole === UserRole.ADMIN;

  const userId =
    isPrivileged && params.targetUserId ? params.targetUserId : params.requesterId;

  const fromUtc = params.from ? parseRangeDate(params.from, 'start') : undefined;
  const toUtc = params.to ? parseRangeDate(params.to, 'end') : undefined;

  const entries = await repo.findEntriesForUser({ userId, fromUtc, toUtc });
  if (entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id);
  const [allBreaks, allOvertimes, allCorrections, correctedIds] = await Promise.all([
    repo.findBreaksByEntryIds(entryIds),
    repo.findOvertimeByEntryIds(entryIds),
    findCorrectionRequestsByEntryIds(entryIds),
    repo.findCorrectedEntryIds(entryIds),
  ]);

  return entries.map((entry) => {
    const breaks = allBreaks.filter((b) => b.time_entry_id === entry.id);
    const overtime = allOvertimes.find((o) => o.time_entry_id === entry.id) ?? null;
    const pendingCr = allCorrections.find(
      (c) => c.time_entry_id === entry.id && c.status === 'PENDING',
    ) ?? null;
    const isCorrected = correctedIds.includes(entry.id);

    const totalBreakMinutes = sumBreakMinutes(breaks);
    const excessBreakMinutes = Math.max(0, totalBreakMinutes - BREAK_ALLOWANCE_MINUTES);

    const grossMinutes = entry.clock_out_at
      ? Math.floor((entry.clock_out_at.getTime() - entry.clock_in_at.getTime()) / 60_000)
      : null;

    const paidMinutes =
      grossMinutes !== null ? calcPaidHours(grossMinutes, totalBreakMinutes) : null;

    return {
      id: entry.id,
      clockInAt: entry.clock_in_at.toISOString(),
      clockOutAt: entry.clock_out_at?.toISOString() ?? null,
      grossMinutes,
      totalBreakMinutes,
      excessBreakMinutes,
      paidMinutes,
      isAutoClosedBreak: entry.is_auto_closed_break === 1,
      isFlagged: entry.is_flagged === 1 && !entry.manager_reviewed_at,
      isBreakReviewed: entry.is_auto_closed_break === 1 && !!entry.manager_reviewed_at,
      isCorrected,
      isRetroactive: entry.is_retroactive === 1,
      employeeNote: entry.employee_note,
      breaks: breaks.map((b) => ({
        id: b.id,
        breakStartAt: b.break_start_at.toISOString(),
        breakEndAt: b.break_end_at?.toISOString() ?? null,
        durationMinutes: b.break_end_at
          ? Math.floor((b.break_end_at.getTime() - b.break_start_at.getTime()) / 60_000)
          : null,
      })),
      overtimeRequest: overtime
        ? { id: overtime.id, status: overtime.status, overtimeMinutes: overtime.overtime_minutes }
        : null,
      pendingCorrection: pendingCr
        ? {
            id: pendingCr.id,
            requestedClockInAt: pendingCr.requested_clock_in_at.toISOString(),
            requestedClockOutAt: pendingCr.requested_clock_out_at?.toISOString() ?? null,
            employeeNote: pendingCr.employee_note,
          }
        : null,
    };
  });
}

export async function updateNote(params: {
  requesterId: number;
  entryId: number;
  note: string | null;
}): Promise<void> {
  const entry = await repo.findEntryById(params.entryId);

  if (!entry) {
    throw new AppError('Time entry not found.', 404, ErrorCode.NOT_FOUND);
  }
  if (entry.user_id !== params.requesterId) {
    throw new AppError('Access denied.', 403, ErrorCode.FORBIDDEN);
  }

  await repo.updateEntryNote(params.entryId, params.note);
}
