import { DateTime } from 'luxon';
import { ErrorCode, UserRole } from '@app/shared';
import type { CorrectionRequestDto, UpdateCorrectionRequestDto, BreakRequest } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { APP_TZ, OVERTIME_THRESHOLD_MINUTES } from '../lib/constants.js';
import { executeReview } from '../lib/reviewWorkflow.js';
import { findEntryById } from '../history/history.repository.js';
import { findUserById } from '../users/users.repository.js';
import { isCurrentMonthEntry } from '../utils/periodLock.js';
import { insertOvertimeRequest } from '../overtime/overtime.repository.js';
import { db } from '../db/connection.js';
import * as repo from './correction-requests.repository.js';

const TZ = APP_TZ;

export interface CorrectionRequestResult {
  id: number;
  timeEntryId: number;
  requestedClockIn: string;
  requestedClockOut: string | null;
  breaks: BreakRequest[] | null;
  employeeNote: string;
  status: string;
  managerNote: string | null;
  reviewedAt: string | null;
  updatedAt: string;
}

function parseTimeOnDate(date: Date, timeStr: string): Date {
  const base = DateTime.fromJSDate(date, { zone: TZ });
  const [h, m, s = '00'] = timeStr.split(':');
  return base
    .set({ hour: Number(h), minute: Number(m), second: Number(s) })
    .toUTC()
    .toJSDate();
}

function validateBreaks(breaks: BreakRequest[], clockIn: Date, clockOut: Date | null): void {
  for (const b of breaks) {
    const start = parseTimeOnDate(clockIn, b.start);
    const end = parseTimeOnDate(clockIn, b.end);
    if (end <= start) {
      throw new AppError('Break end must be after break start', 400, ErrorCode.VALIDATION_ERROR);
    }
    if (clockOut && end > clockOut) {
      throw new AppError('Break must end before clock-out', 400, ErrorCode.VALIDATION_ERROR);
    }
  }
}

function toResult(row: Awaited<ReturnType<typeof repo.findCorrectionRequestById>>): CorrectionRequestResult {
  if (!row) throw new AppError('Correction request not found.', 404, ErrorCode.NOT_FOUND);
  return {
    id: row.id,
    timeEntryId: row.time_entry_id,
    requestedClockIn: row.requested_clock_in_at.toISOString(),
    requestedClockOut: row.requested_clock_out_at?.toISOString() ?? null,
    breaks: row.requested_breaks_json ? (JSON.parse(row.requested_breaks_json) as BreakRequest[]) : null,
    employeeNote: row.employee_note,
    status: row.status,
    managerNote: row.manager_note,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function submitCorrectionRequest(
  requesterId: number,
  requesterRole: string,
  dto: CorrectionRequestDto,
): Promise<CorrectionRequestResult> {
  const entry = await findEntryById(dto.timeEntryId);
  if (!entry) throw new AppError('Time entry not found.', 404, ErrorCode.NOT_FOUND);
  if (entry.user_id !== requesterId) throw new AppError('Access denied.', 403, ErrorCode.FORBIDDEN);
  const isManager = requesterRole === 'MANAGER' || requesterRole === 'ADMIN';
  if (!isManager && !isCurrentMonthEntry(entry.clock_in_at)) {
    throw new AppError('Only entries from the current month can be edited.', 403, ErrorCode.PERIOD_LOCKED);
  }

  const existing = await repo.findCorrectionRequestByEntryId(dto.timeEntryId);
  if (existing) {
    throw new AppError(
      'A pending edit request already exists for this entry.',
      409,
      ErrorCode.CORRECTION_REQUEST_PENDING,
    );
  }

  const requestedClockIn = parseTimeOnDate(entry.clock_in_at, dto.clockInTime);
  const requestedClockOut = dto.clockOutTime
    ? parseTimeOnDate(entry.clock_in_at, dto.clockOutTime)
    : null;

  if (requestedClockOut && requestedClockOut <= requestedClockIn) {
    throw new AppError('Clock-out must be after clock-in', 400, ErrorCode.VALIDATION_ERROR);
  }
  if (dto.breaks) validateBreaks(dto.breaks, requestedClockIn, requestedClockOut);

  const id = await repo.insertCorrectionRequest({
    timeEntryId: dto.timeEntryId,
    userId: requesterId,
    requestedClockInAt: requestedClockIn,
    requestedClockOutAt: requestedClockOut,
    requestedBreaksJson: dto.breaks ? JSON.stringify(dto.breaks) : null,
    employeeNote: dto.employeeNote,
  });

  const row = await repo.findCorrectionRequestById(id);
  return toResult(row);
}

export async function updateCorrectionRequest(
  requesterId: number,
  requestId: number,
  dto: UpdateCorrectionRequestDto,
): Promise<CorrectionRequestResult> {
  const request = await repo.findCorrectionRequestById(requestId);
  if (!request) throw new AppError('Correction request not found.', 404, ErrorCode.NOT_FOUND);
  if (request.user_id !== requesterId) throw new AppError('Access denied.', 403, ErrorCode.FORBIDDEN);
  if (request.status !== 'PENDING') {
    throw new AppError('Cannot edit a reviewed request.', 409, ErrorCode.OT_ALREADY_REVIEWED);
  }

  const baseDate = request.requested_clock_in_at;
  const newClockIn = dto.clockInTime ? parseTimeOnDate(baseDate, dto.clockInTime) : undefined;
  const newClockOut =
    dto.clockOutTime !== undefined
      ? dto.clockOutTime
        ? parseTimeOnDate(baseDate, dto.clockOutTime)
        : null
      : undefined;

  const resolvedClockIn = newClockIn ?? request.requested_clock_in_at;
  const resolvedClockOut = newClockOut !== undefined ? newClockOut : request.requested_clock_out_at;

  if (resolvedClockOut && resolvedClockOut <= resolvedClockIn) {
    throw new AppError('Clock-out must be after clock-in', 400, ErrorCode.VALIDATION_ERROR);
  }
  if (dto.breaks) validateBreaks(dto.breaks, resolvedClockIn, resolvedClockOut);

  await repo.updateCorrectionRequest(requestId, {
    requestedClockInAt: newClockIn,
    requestedClockOutAt: newClockOut,
    requestedBreaksJson: dto.breaks !== undefined ? JSON.stringify(dto.breaks) : undefined,
    employeeNote: dto.employeeNote,
  });

  const updated = await repo.findCorrectionRequestById(requestId);
  return toResult(updated);
}

export async function getCorrectionRequestForEntry(
  requesterId: number,
  timeEntryId: number,
): Promise<CorrectionRequestResult | null> {
  const entry = await findEntryById(timeEntryId);
  if (!entry) throw new AppError('Time entry not found.', 404, ErrorCode.NOT_FOUND);
  if (entry.user_id !== requesterId) throw new AppError('Access denied.', 403, ErrorCode.FORBIDDEN);

  const request = await repo.findCorrectionRequestByEntryId(timeEntryId);
  return request ? toResult(request) : null;
}

export async function deleteCorrectionRequest(
  requesterId: number,
  requestId: number,
): Promise<void> {
  const request = await repo.findCorrectionRequestById(requestId);
  if (!request) throw new AppError('Correction request not found.', 404, ErrorCode.NOT_FOUND);
  if (request.user_id !== requesterId) throw new AppError('Access denied.', 403, ErrorCode.FORBIDDEN);
  if (request.status !== 'PENDING') {
    throw new AppError('Cannot delete a reviewed request.', 409, ErrorCode.OT_ALREADY_REVIEWED);
  }
  await repo.deleteCorrectionRequest(requestId);
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

export async function listForManager(
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

export async function reviewForManager(params: {
  requestId: number;
  reviewerId: number;
  reviewerRole: string;
  action: 'APPROVED' | 'REJECTED';
  note: string | null;
}): Promise<void> {
  const request = await repo.findCorrectionRequestById(params.requestId);

  await executeReview({
    request,
    resourceName: 'Correction request',
    reviewerId: params.reviewerId,
    reviewerRole: params.reviewerRole,
    action: params.action,
    note: params.note,
    canReview: async (req) => {
      if (params.reviewerRole === UserRole.ADMIN) return true;
      const employee = await findUserById(req.user_id);
      const isOwnEmployee = employee?.manager_id === params.reviewerId;
      const isManagerOrAdmin =
        employee?.role === UserRole.MANAGER || employee?.role === UserRole.ADMIN;
      return isOwnEmployee || isManagerOrAdmin;
    },
    onReject: async (req) => {
      await repo.rejectCorrection(req.id, params.reviewerId, params.note);
    },
    onApprove: async () => {
      const r = request!;
      const entry = await findEntryById(r.time_entry_id);
      if (!entry) throw new AppError('Time entry not found.', 404, ErrorCode.NOT_FOUND);

      const breaks: Array<{ break_start_at: Date; break_end_at: Date }> = [];
      if (r.requested_breaks_json) {
        const raw = JSON.parse(r.requested_breaks_json) as BreakRequest[];
        for (const b of raw) {
          breaks.push({
            break_start_at: parseTimeOnDate(r.requested_clock_in_at, b.start),
            break_end_at: parseTimeOnDate(r.requested_clock_in_at, b.end),
          });
        }
      }

      const oldState = JSON.stringify({
        clockIn: entry.clock_in_at.toISOString(),
        clockOut: entry.clock_out_at?.toISOString() ?? null,
      });
      const newState = JSON.stringify({
        clockIn: r.requested_clock_in_at.toISOString(),
        clockOut: r.requested_clock_out_at?.toISOString() ?? null,
      });

      await db.transaction().execute(async (trx) => {
        await repo.approveCorrection(trx, {
          correctionRequestId: r.id,
          timeEntryId: r.time_entry_id,
          targetUserId: r.user_id,
          actorId: params.reviewerId,
          newClockIn: r.requested_clock_in_at,
          newClockOut: r.requested_clock_out_at ?? null,
          breaks,
          oldState,
          newState,
          reviewerNote: params.note,
        });

        if (r.requested_clock_out_at) {
          const grossMinutes = Math.floor(
            (r.requested_clock_out_at.getTime() - r.requested_clock_in_at.getTime()) / 60_000,
          );
          if (grossMinutes > OVERTIME_THRESHOLD_MINUTES) {
            await insertOvertimeRequest(trx, {
              timeEntryId: r.time_entry_id,
              userId: r.user_id,
              overtimeMinutes: grossMinutes - OVERTIME_THRESHOLD_MINUTES,
            });
          }
        }
      });
    },
  });
}
