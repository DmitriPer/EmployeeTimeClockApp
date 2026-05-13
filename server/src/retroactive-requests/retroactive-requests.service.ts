import { DateTime } from 'luxon';
import { ErrorCode, UserRole } from '@app/shared';
import type { BreakRequest } from '@app/shared';
import { AppError } from '../lib/errors.js';
import { executeReview } from '../lib/reviewWorkflow.js';
import { db } from '../db/connection.js';
import { isCurrentMonthDate } from '../utils/periodLock.js';
import { findUserById } from '../users/users.repository.js';
import * as repo from './retroactive-requests.repository.js';

const TZ = 'Asia/Jerusalem';
const OVERTIME_THRESHOLD_MINUTES = 9 * 60;

export interface RetroactiveRequestResult {
  id: number;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  breaks: BreakRequest[] | null;
  employeeNote: string;
  status: string;
  managerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PendingRetroactiveRequest {
  id: number;
  employeeName: string;
  employeeId: string;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  breaks: BreakRequest[] | null;
  employeeNote: string;
  createdAt: string;
}

function toTimeInput(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function toUtcDatetime(dateStr: string, timeStr: string): Date {
  return DateTime.fromISO(`${dateStr}T${timeStr}`, { zone: TZ }).toUTC().toJSDate();
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function validateBreaks(breaks: BreakRequest[], clockInTime: string, clockOutTime: string): void {
  const inMin = timeToMinutes(clockInTime);
  const outMin = timeToMinutes(clockOutTime);
  for (const b of breaks) {
    const startMin = timeToMinutes(b.start);
    const endMin = timeToMinutes(b.end);
    if (endMin <= startMin) {
      throw new AppError('Break end must be after break start', 400, ErrorCode.VALIDATION_ERROR);
    }
    if (startMin < inMin || endMin > outMin) {
      throw new AppError('Break must be within clock-in and clock-out', 400, ErrorCode.VALIDATION_ERROR);
    }
  }
}

export async function submitRetroactiveRequest(
  requesterId: number,
  params: {
    date: string;
    clockInTime: string;
    clockOutTime: string;
    breaks?: BreakRequest[];
    employeeNote: string;
    requesterRole?: string;
  },
): Promise<RetroactiveRequestResult> {
  if (!params.employeeNote?.trim()) {
    throw new AppError('An explanation is required', 400, ErrorCode.VALIDATION_ERROR);
  }
  const isManager = params.requesterRole === 'MANAGER' || params.requesterRole === 'ADMIN';
  if (!isManager && !isCurrentMonthDate(params.date)) {
    throw new AppError(
      'You can only submit retroactive entries for the current month.',
      403,
      ErrorCode.PERIOD_LOCKED,
    );
  }
  if (timeToMinutes(params.clockOutTime) <= timeToMinutes(params.clockInTime)) {
    throw new AppError('Clock-out must be after clock-in', 400, ErrorCode.VALIDATION_ERROR);
  }
  if (params.breaks?.length) {
    validateBreaks(params.breaks, params.clockInTime, params.clockOutTime);
  }

  // Block if entry already exists for that date
  const clockInUtc = toUtcDatetime(params.date, '00:00');
  const clockOutUtc = toUtcDatetime(params.date, '23:59');
  const existingEntry = await db
    .selectFrom('time_entries')
    .select('id')
    .where('user_id', '=', requesterId)
    .where('clock_in_at', '>=', clockInUtc)
    .where('clock_in_at', '<=', clockOutUtc)
    .executeTakeFirst();

  if (existingEntry) {
    throw new AppError(
      'An entry already exists for this date. Use the edit request form instead.',
      409,
      ErrorCode.ENTRY_ALREADY_EXISTS,
    );
  }

  // Block if open session today matches requested date
  const todayStr = DateTime.now().setZone(TZ).toISODate()!;
  if (params.date === todayStr) {
    const openSession = await db
      .selectFrom('time_entries')
      .select('id')
      .where('user_id', '=', requesterId)
      .where('clock_out_at', 'is', null)
      .executeTakeFirst();
    if (openSession) {
      throw new AppError(
        'You have an active session today. Use Clock Out to end it.',
        409,
        ErrorCode.SESSION_OPEN,
      );
    }
  }

  // Block if already has pending retroactive request
  const pendingRequest = await repo.findPendingRetroactiveRequestByUserId(requesterId);
  if (pendingRequest) {
    throw new AppError(
      'You already have a pending retroactive request. Wait for it to be reviewed.',
      409,
      ErrorCode.RETROACTIVE_REQUEST_PENDING,
    );
  }

  const id = await repo.insertRetroactiveRequest({
    userId: requesterId,
    requestedDate: params.date,
    clockInTime: params.clockInTime,
    clockOutTime: params.clockOutTime,
    breaksJson: params.breaks?.length ? JSON.stringify(params.breaks) : null,
    employeeNote: params.employeeNote,
  });

  const row = await repo.findRetroactiveRequestById(id);
  return toResult(row!);
}

export async function getMyRetroactiveRequests(
  requesterId: number,
): Promise<RetroactiveRequestResult[]> {
  const rows = await repo.findRetroactiveRequestsByUserId(requesterId);
  return rows.map(toResult);
}

export async function deleteRetroactiveRequest(
  requesterId: number,
  requestId: number,
): Promise<void> {
  const request = await repo.findRetroactiveRequestById(requestId);
  if (!request) throw new AppError('Retroactive request not found.', 404, ErrorCode.NOT_FOUND);
  if (request.user_id !== requesterId) throw new AppError('Access denied.', 403, ErrorCode.FORBIDDEN);
  if (request.status !== 'PENDING') {
    throw new AppError('Cannot cancel a reviewed request.', 409, ErrorCode.OT_ALREADY_REVIEWED);
  }
  await repo.deleteRetroactiveRequest(requestId);
}

export async function getPendingRetroactiveRequests(
  reviewerId: number,
  reviewerRole: string,
): Promise<PendingRetroactiveRequest[]> {
  const managerId = reviewerRole === 'MANAGER' ? reviewerId : undefined;
  const rows = await repo.findPendingRetroactiveRequests(managerId);
  return rows
    .filter((r) => r.user_id !== reviewerId)
    .map((r) => ({
      id: r.id,
      employeeName: r.employee_name,
      employeeId: r.employee_id,
      date: r.requested_date as string,
      clockInTime: r.clock_in_time as string,
      clockOutTime: r.clock_out_time as string,
      breaks: r.breaks_json ? (JSON.parse(r.breaks_json) as BreakRequest[]) : null,
      employeeNote: r.employee_note,
      createdAt: r.created_at.toISOString(),
    }));
}

export async function reviewRetroactiveRequest(
  reviewerId: number,
  requestId: number,
  reviewerRole: string,
  action: 'APPROVED' | 'REJECTED',
  managerNote: string | null,
): Promise<{ id: number; status: string; timeEntryId?: number }> {
  const request = await repo.findRetroactiveRequestById(requestId);

  return executeReview({
    request,
    resourceName: 'Retroactive request',
    reviewerId,
    reviewerRole,
    action,
    note: managerNote,
    canReview: async (req) => {
      if (reviewerRole === UserRole.ADMIN) return true;
      const employee = await findUserById(req.user_id);
      return employee?.manager_id === reviewerId;
    },
    onReject: async () => {
      await repo.rejectRetroactiveRequest(requestId, reviewerId, managerNote);
      return { id: requestId, status: 'REJECTED' };
    },
    onApprove: async () => {
      const r = request!;
      const breaks: BreakRequest[] = r.breaks_json
        ? (JSON.parse(r.breaks_json) as BreakRequest[])
        : [];

      const dateStr = r.requested_date as string;
      const clockInUtc = toUtcDatetime(dateStr, r.clock_in_time as string);
      const clockOutUtc = toUtcDatetime(dateStr, r.clock_out_time as string);
      const grossMinutes = Math.round((clockOutUtc.getTime() - clockInUtc.getTime()) / 60_000);

      let timeEntryId = 0;

      await db.transaction().execute(async (trx) => {
        const entryResult = await trx
          .insertInto('time_entries')
          .values({
            user_id: r.user_id,
            clock_in_at: clockInUtc,
            clock_out_at: clockOutUtc,
            is_retroactive: 1,
            employee_note: r.employee_note,
          })
          .executeTakeFirstOrThrow();
        timeEntryId = Number(entryResult.insertId);

        for (const b of breaks) {
          const breakStart = toUtcDatetime(dateStr, b.start);
          const breakEnd = toUtcDatetime(dateStr, b.end);
          await trx
            .insertInto('break_events')
            .values({ time_entry_id: timeEntryId, break_start_at: breakStart, break_end_at: breakEnd })
            .execute();
        }

        await trx
          .insertInto('audit_log')
          .values({
            time_entry_id: timeEntryId,
            actor_id: reviewerId,
            target_user_id: r.user_id,
            field_name: 'retroactive_entry',
            old_value: 'none',
            new_value: JSON.stringify({
              date: dateStr,
              clockIn: r.clock_in_time,
              clockOut: r.clock_out_time,
              breaks,
            }),
          })
          .execute();

        if (grossMinutes > OVERTIME_THRESHOLD_MINUTES) {
          await trx
            .insertInto('overtime_requests')
            .values({
              time_entry_id: timeEntryId,
              user_id: r.user_id,
              overtime_minutes: grossMinutes - OVERTIME_THRESHOLD_MINUTES,
              status: 'APPROVED',
              reviewed_by: reviewerId,
              reviewed_at: new Date(),
            })
            .execute();
        }

        await trx
          .updateTable('retroactive_entry_requests')
          .set({ status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date(), manager_note: managerNote })
          .where('id', '=', requestId)
          .execute();
      });

      return { id: requestId, status: 'APPROVED', timeEntryId };
    },
  });
}

function toResult(row: NonNullable<Awaited<ReturnType<typeof repo.findRetroactiveRequestById>>>): RetroactiveRequestResult {
  return {
    id: row.id,
    date: row.requested_date as string,
    clockInTime: row.clock_in_time as string,
    clockOutTime: row.clock_out_time as string,
    breaks: row.breaks_json ? (JSON.parse(row.breaks_json) as BreakRequest[]) : null,
    employeeNote: row.employee_note,
    status: row.status,
    managerNote: row.manager_note,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}
