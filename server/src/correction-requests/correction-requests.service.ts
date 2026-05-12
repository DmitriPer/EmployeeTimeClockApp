import { DateTime } from 'luxon';
import { ErrorCode } from '@app/shared';
import type { CorrectionRequestDto, UpdateCorrectionRequestDto, BreakRequest } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { findEntryById } from '../history/history.repository.js';
import { isCurrentMonthEntry } from '../utils/periodLock.js';
import * as repo from './correction-requests.repository.js';

const TZ = 'Asia/Jerusalem';

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
