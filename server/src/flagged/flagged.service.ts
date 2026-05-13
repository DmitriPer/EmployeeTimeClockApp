import { DateTime } from 'luxon';
import { ErrorCode, UserRole } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { asRepoManagerFilter } from '../manager/manager.scope.js';
import * as repo from './flagged.repository.js';

const TZ = 'Asia/Jerusalem';

export interface FlaggedSessionRow {
  timeEntryId: number;
  employeeName: string;
  employeeId: string;
  clockInAt: string;
  clockOutAt: string | null;
  flagReason: 'AUTO_CLOSED_BREAK';
  correctionCount: number;
  breakStartAt: string | null;
  breakEndAt: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

function parseBreakTime(baseDate: Date, timeStr: string): Date {
  const base = DateTime.fromJSDate(baseDate, { zone: TZ });
  const [h, m, s = '00'] = timeStr.split(':');
  return base.set({ hour: Number(h), minute: Number(m), second: Number(s) }).toUTC().toJSDate();
}

export async function listForManager(
  requesterId: number,
  requesterRole: string,
  employeeId?: number,
): Promise<{ sessions: FlaggedSessionRow[]; total: number }> {
  const managerId = asRepoManagerFilter(requesterId, requesterRole);
  const rows = await repo.findFlaggedSessions(managerId, employeeId);
  const sessions = rows.map((r) => ({
    timeEntryId: r.id,
    employeeName: r.employee_name,
    employeeId: r.employee_id,
    clockInAt: r.clock_in_at.toISOString(),
    clockOutAt: r.clock_out_at?.toISOString() ?? null,
    flagReason: 'AUTO_CLOSED_BREAK' as const,
    correctionCount: Number(r.correction_count),
    breakStartAt: r.break_start_at instanceof Date ? r.break_start_at.toISOString() : null,
    breakEndAt: r.break_end_at instanceof Date ? r.break_end_at.toISOString() : null,
    reviewedAt: r.manager_reviewed_at instanceof Date ? r.manager_reviewed_at.toISOString() : null,
    reviewedByName: r.reviewed_by_name ?? null,
  }));
  return { sessions, total: sessions.length };
}

export async function review(
  managerId: number,
  managerRole: string,
  timeEntryId: number,
  breakEndTime: string,
): Promise<void> {
  const entry = await repo.findFlaggedEntryWithBreak(timeEntryId);
  if (!entry) throw new AppError('Entry not found.', 404, ErrorCode.NOT_FOUND);
  if (!entry.is_flagged) throw new AppError('Entry is not flagged.', 400, ErrorCode.VALIDATION_ERROR);

  if (managerRole === UserRole.MANAGER && entry.manager_id !== managerId) {
    throw new AppError('Access denied.', 403, ErrorCode.FORBIDDEN);
  }

  if (!entry.break_start_at) {
    throw new AppError('No break found for this entry.', 404, ErrorCode.NOT_FOUND);
  }

  const newBreakEnd = parseBreakTime(entry.break_start_at, breakEndTime);

  if (newBreakEnd <= entry.break_start_at) {
    throw new AppError('Break end must be after break start.', 400, ErrorCode.VALIDATION_ERROR);
  }
  if (entry.clock_out_at && newBreakEnd > entry.clock_out_at) {
    throw new AppError('Break end cannot be after clock-out.', 400, ErrorCode.VALIDATION_ERROR);
  }

  await repo.updateFlaggedSessionReview({
    timeEntryId,
    newBreakEndAt: newBreakEnd,
    actorId: managerId,
    targetUserId: entry.user_id,
    oldBreakEndAt: entry.break_end_at instanceof Date ? entry.break_end_at.toISOString() : 'null',
  });
}
