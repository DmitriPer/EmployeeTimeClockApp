import { DateTime } from 'luxon';
import { ErrorCode, UserRole } from '@app/shared';
import type { BreakRequest } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { db } from '../db/connection.js';
import * as repo from './manager.repository.js';
import { findUserById } from '../users/users.repository.js';
import { findEntryById } from '../history/history.repository.js';

const TZ = 'Asia/Jerusalem';
const OVERTIME_THRESHOLD_MINUTES = 9 * 60;

function parseBreakTime(baseDate: Date, timeStr: string): Date {
  const base = DateTime.fromJSDate(baseDate, { zone: TZ });
  const [h, m, s = '00'] = timeStr.split(':');
  return base.set({ hour: Number(h), minute: Number(m), second: Number(s) }).toUTC().toJSDate();
}

export interface OvertimeRequestRow {
  id: number;
  userId: number;
  timeEntryId: number;
  status: string;
  overtimeMinutes: number;
  managerNote: string | null;
  createdAt: string;
  clockInAt: string;
  clockOutAt: string | null;
  employeeName: string;
  employeeId: string;
}

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

export async function getPendingOvertimeRequests(
  requesterId: number,
  requesterRole: string,
): Promise<OvertimeRequestRow[]> {
  const managerId = requesterRole === UserRole.MANAGER ? requesterId : undefined;
  const rows = await repo.findPendingOvertimeRequests(managerId);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    timeEntryId: r.time_entry_id,
    status: r.status,
    overtimeMinutes: r.overtime_minutes,
    managerNote: r.manager_note,
    createdAt: r.created_at.toISOString(),
    clockInAt: r.clock_in_at.toISOString(),
    clockOutAt: r.clock_out_at?.toISOString() ?? null,
    employeeName: r.employee_name,
    employeeId: r.employee_id,
  }));
}

export async function reviewOvertimeRequest(params: {
  requestId: number;
  reviewerId: number;
  reviewerRole: string;
  action: 'APPROVED' | 'REJECTED';
  note: string | null;
}): Promise<void> {
  const request = await repo.findOvertimeRequestById(params.requestId);

  if (!request) {
    throw new AppError('Overtime request not found.', 404, ErrorCode.NOT_FOUND);
  }
  if (request.status !== 'PENDING') {
    throw new AppError('This request has already been reviewed.', 409, ErrorCode.OT_ALREADY_REVIEWED);
  }

  if (params.reviewerRole === UserRole.MANAGER) {
    const employee = await findUserById(request.user_id);
    if (employee?.manager_id !== params.reviewerId) {
      throw new AppError(
        'This request does not belong to one of your employees.',
        403,
        ErrorCode.FORBIDDEN,
      );
    }
  }

  await repo.updateOvertimeRequest({
    id: params.requestId,
    status: params.action,
    reviewedBy: params.reviewerId,
    managerNote: params.note,
  });
}

export interface CorrectionRequestRow {
  id: number;
  timeEntryId: number;
  userId: number;
  employeeName: string;
  employeeId: string;
  requestedClockInAt: string;
  requestedClockOutAt: string | null;
  requestedBreaks: BreakRequest[] | null;
  employeeNote: string;
  currentClockInAt: string;
  currentClockOutAt: string | null;
  createdAt: string;
}

export async function getCorrectionRequests(
  requesterId: number,
  requesterRole: string,
): Promise<CorrectionRequestRow[]> {
  const managerId = requesterRole === UserRole.MANAGER ? requesterId : undefined;
  const rows = await repo.findPendingCorrectionRequests(requesterId, managerId);
  return rows.map((r) => ({
    id: r.id,
    timeEntryId: r.time_entry_id,
    userId: r.user_id,
    employeeName: r.employee_name,
    employeeId: r.employee_id,
    requestedClockInAt: r.requested_clock_in_at.toISOString(),
    requestedClockOutAt: r.requested_clock_out_at?.toISOString() ?? null,
    requestedBreaks: r.requested_breaks_json
      ? (JSON.parse(r.requested_breaks_json) as BreakRequest[])
      : null,
    employeeNote: r.employee_note,
    currentClockInAt: r.current_clock_in_at.toISOString(),
    currentClockOutAt: r.current_clock_out_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function reviewCorrectionRequest(params: {
  requestId: number;
  reviewerId: number;
  reviewerRole: string;
  action: 'APPROVED' | 'REJECTED';
  note: string | null;
}): Promise<void> {
  const request = await repo.findCorrectionRequestById(params.requestId);
  if (!request) throw new AppError('Correction request not found.', 404, ErrorCode.NOT_FOUND);
  if (request.status !== 'PENDING')
    throw new AppError('This request has already been reviewed.', 409, ErrorCode.OT_ALREADY_REVIEWED);
  if (request.user_id === params.reviewerId)
    throw new AppError('Cannot review your own request.', 403, ErrorCode.CANNOT_SELF_APPROVE);

  if (params.reviewerRole === UserRole.MANAGER) {
    const employee = await findUserById(request.user_id);
    const isOwnEmployee = employee?.manager_id === params.reviewerId;
    const isManagerOrAdmin =
      employee?.role === UserRole.MANAGER || employee?.role === UserRole.ADMIN;
    if (!isOwnEmployee && !isManagerOrAdmin) {
      throw new AppError(
        'This request does not belong to one of your employees.',
        403,
        ErrorCode.FORBIDDEN,
      );
    }
  }

  if (params.action === 'REJECTED') {
    await repo.rejectCorrection(params.requestId, params.reviewerId, params.note);
    return;
  }

  const entry = await findEntryById(request.time_entry_id);
  if (!entry) throw new AppError('Time entry not found.', 404, ErrorCode.NOT_FOUND);

  const breaks: Array<{ break_start_at: Date; break_end_at: Date }> = [];
  if (request.requested_breaks_json) {
    const raw = JSON.parse(request.requested_breaks_json) as BreakRequest[];
    for (const b of raw) {
      breaks.push({
        break_start_at: parseBreakTime(request.requested_clock_in_at, b.start),
        break_end_at: parseBreakTime(request.requested_clock_in_at, b.end),
      });
    }
  }

  const oldState = JSON.stringify({
    clockIn: entry.clock_in_at.toISOString(),
    clockOut: entry.clock_out_at?.toISOString() ?? null,
  });
  const newState = JSON.stringify({
    clockIn: request.requested_clock_in_at.toISOString(),
    clockOut: request.requested_clock_out_at?.toISOString() ?? null,
  });

  await db.transaction().execute(async (trx) => {
    await repo.approveCorrection(trx, {
      correctionRequestId: params.requestId,
      timeEntryId: request.time_entry_id,
      targetUserId: request.user_id,
      actorId: params.reviewerId,
      newClockIn: request.requested_clock_in_at,
      newClockOut: request.requested_clock_out_at ?? null,
      breaks,
      oldState,
      newState,
      reviewerNote: params.note,
    });

    if (request.requested_clock_out_at) {
      const grossMinutes = Math.floor(
        (request.requested_clock_out_at.getTime() - request.requested_clock_in_at.getTime()) /
          60_000,
      );
      if (grossMinutes > OVERTIME_THRESHOLD_MINUTES) {
        await repo.insertOvertimeRequest(trx, {
          timeEntryId: request.time_entry_id,
          userId: request.user_id,
          overtimeMinutes: grossMinutes - OVERTIME_THRESHOLD_MINUTES,
        });
      }
    }
  });
}

export async function getFlaggedSessions(
  requesterId: number,
  requesterRole: string,
  employeeId?: number,
): Promise<{ sessions: FlaggedSessionRow[]; total: number }> {
  const managerId = requesterRole === UserRole.MANAGER ? requesterId : undefined;
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

export async function reviewFlaggedSession(
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

import * as retroactiveService from '../retroactive-requests/retroactive-requests.service.js';

export async function getRetroactiveRequests(
  reviewerId: number,
  reviewerRole: string,
) {
  return retroactiveService.getPendingRetroactiveRequests(reviewerId, reviewerRole);
}

export async function reviewRetroactiveRequest(params: {
  requestId: number;
  reviewerId: number;
  reviewerRole: string;
  action: 'APPROVED' | 'REJECTED';
  note: string | null;
}) {
  return retroactiveService.reviewRetroactiveRequest(
    params.reviewerId,
    params.requestId,
    params.action,
    params.note,
  );
}
