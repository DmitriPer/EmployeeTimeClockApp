import { db } from '../db/connection.js';

export async function findPendingOvertimeRequests() {
  return db
    .selectFrom('overtime_requests as ot')
    .innerJoin('users as u', 'u.id', 'ot.user_id')
    .innerJoin('time_entries as te', 'te.id', 'ot.time_entry_id')
    .select([
      'ot.id',
      'ot.user_id',
      'ot.time_entry_id',
      'ot.status',
      'ot.overtime_minutes',
      'ot.manager_note',
      'ot.reviewed_by',
      'ot.reviewed_at',
      'ot.created_at',
      'u.name as employee_name',
      'u.employee_id as employee_id',
      'te.clock_in_at',
      'te.clock_out_at',
    ])
    .where('ot.status', '=', 'PENDING')
    .orderBy('ot.created_at', 'asc')
    .execute();
}

export async function findOvertimeRequestById(id: number) {
  return db
    .selectFrom('overtime_requests')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
}

export async function updateOvertimeRequest(params: {
  id: number;
  status: 'APPROVED' | 'REJECTED';
  reviewedBy: number;
  managerNote: string | null;
}): Promise<void> {
  await db
    .updateTable('overtime_requests')
    .set({
      status: params.status,
      reviewed_by: params.reviewedBy,
      reviewed_at: new Date(),
      manager_note: params.managerNote,
    })
    .where('id', '=', params.id)
    .execute();
}

export async function findFlaggedSessions() {
  return db
    .selectFrom('time_entries as te')
    .innerJoin('users as u', 'u.id', 'te.user_id')
    .select([
      'te.id',
      'te.user_id',
      'te.clock_in_at',
      'te.clock_out_at',
      'te.is_auto_closed_break',
      'te.is_flagged',
      'te.employee_note',
      'u.name as employee_name',
      'u.employee_id as employee_id',
    ])
    .where('te.is_flagged', '=', 1)
    .orderBy('te.clock_in_at', 'desc')
    .execute();
}
