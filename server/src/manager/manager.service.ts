import { ErrorCode } from '@app/shared';
import { AppError } from '../lib/errors.js';
import * as repo from './manager.repository.js';

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
}

export async function getPendingOvertimeRequests(): Promise<OvertimeRequestRow[]> {
  const rows = await repo.findPendingOvertimeRequests();
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

  await repo.updateOvertimeRequest({
    id: params.requestId,
    status: params.action,
    reviewedBy: params.reviewerId,
    managerNote: params.note,
  });
}

export async function getFlaggedSessions(userId?: number): Promise<{ sessions: FlaggedSessionRow[]; total: number }> {
  const rows = await repo.findFlaggedSessions(userId);
  const sessions = rows.map((r) => ({
    timeEntryId: r.id,
    employeeName: r.employee_name,
    employeeId: r.employee_id,
    clockInAt: r.clock_in_at.toISOString(),
    clockOutAt: r.clock_out_at?.toISOString() ?? null,
    flagReason: 'AUTO_CLOSED_BREAK' as const,
    correctionCount: Number(r.correction_count),
  }));
  return { sessions, total: sessions.length };
}
