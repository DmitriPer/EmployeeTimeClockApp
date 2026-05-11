import { ErrorCode } from '@app/shared';
import { AppError } from '../lib/errors.js';
import * as repo from './manager.repository.js';

export async function getPendingOvertimeRequests() {
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

export async function getFlaggedSessions() {
  const rows = await repo.findFlaggedSessions();
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    clockInAt: r.clock_in_at.toISOString(),
    clockOutAt: r.clock_out_at?.toISOString() ?? null,
    isAutoClosedBreak: r.is_auto_closed_break === 1,
    employeeNote: r.employee_note,
    employeeName: r.employee_name,
    employeeId: r.employee_id,
  }));
}
