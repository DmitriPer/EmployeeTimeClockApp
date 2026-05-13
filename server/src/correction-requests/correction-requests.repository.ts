import { db } from '../db/connection.js';
import type { Transaction } from 'kysely';
import type { Database } from '../db/types.js';

export async function findCorrectionRequestByEntryId(timeEntryId: number) {
  return db
    .selectFrom('correction_requests')
    .selectAll()
    .where('time_entry_id', '=', timeEntryId)
    .where('status', '=', 'PENDING')
    .executeTakeFirst();
}

export async function findCorrectionRequestById(id: number) {
  return db
    .selectFrom('correction_requests')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
}

export async function findCorrectionRequestsByEntryIds(entryIds: number[]) {
  if (entryIds.length === 0) return [];
  return db
    .selectFrom('correction_requests')
    .selectAll()
    .where('time_entry_id', 'in', entryIds)
    .where('status', 'in', ['PENDING', 'REJECTED'])
    .execute();
}

export async function insertCorrectionRequest(params: {
  timeEntryId: number;
  userId: number;
  requestedClockInAt: Date;
  requestedClockOutAt: Date | null;
  requestedBreaksJson: string | null;
  employeeNote: string;
}) {
  const result = await db
    .insertInto('correction_requests')
    .values({
      time_entry_id: params.timeEntryId,
      user_id: params.userId,
      requested_clock_in_at: params.requestedClockInAt,
      requested_clock_out_at: params.requestedClockOutAt,
      requested_breaks_json: params.requestedBreaksJson,
      employee_note: params.employeeNote,
    })
    .executeTakeFirstOrThrow();
  return Number(result.insertId);
}

export async function updateCorrectionRequest(
  id: number,
  params: {
    requestedClockInAt?: Date;
    requestedClockOutAt?: Date | null;
    requestedBreaksJson?: string | null;
    employeeNote?: string;
  },
) {
  await db
    .updateTable('correction_requests')
    .set({
      ...(params.requestedClockInAt !== undefined && { requested_clock_in_at: params.requestedClockInAt }),
      ...(params.requestedClockOutAt !== undefined && { requested_clock_out_at: params.requestedClockOutAt }),
      ...(params.requestedBreaksJson !== undefined && { requested_breaks_json: params.requestedBreaksJson }),
      ...(params.employeeNote !== undefined && { employee_note: params.employeeNote }),
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .execute();
}

export async function deleteCorrectionRequest(id: number): Promise<void> {
  await db.deleteFrom('correction_requests').where('id', '=', id).execute();
}

export async function findPendingCorrectionRequests(reviewerId: number, managerId?: number) {
  return db
    .selectFrom('correction_requests as cr')
    .innerJoin('users as u', 'u.id', 'cr.user_id')
    .innerJoin('time_entries as te', 'te.id', 'cr.time_entry_id')
    .select([
      'cr.id',
      'cr.time_entry_id',
      'cr.user_id',
      'cr.requested_clock_in_at',
      'cr.requested_clock_out_at',
      'cr.requested_breaks_json',
      'cr.employee_note',
      'cr.created_at',
      'cr.updated_at',
      'u.name as employee_name',
      'u.employee_id as employee_id',
      'te.clock_in_at as current_clock_in_at',
      'te.clock_out_at as current_clock_out_at',
    ])
    .where('cr.status', '=', 'PENDING')
    .where('cr.user_id', '!=', reviewerId)
    .$if(managerId !== undefined, (qb) =>
      qb.where((eb) =>
        eb.or([
          eb('u.manager_id', '=', managerId!),
          eb('u.role', 'in', ['MANAGER', 'ADMIN']),
        ]),
      ),
    )
    .orderBy('cr.created_at', 'asc')
    .execute();
}

export async function approveCorrection(
  trx: Transaction<Database>,
  params: {
    correctionRequestId: number;
    timeEntryId: number;
    targetUserId: number;
    actorId: number;
    newClockIn: Date;
    newClockOut: Date | null;
    breaks: Array<{ break_start_at: Date; break_end_at: Date }>;
    oldState: string;
    newState: string;
    reviewerNote: string | null;
  },
): Promise<void> {
  await trx
    .updateTable('time_entries')
    .set({ clock_in_at: params.newClockIn, clock_out_at: params.newClockOut })
    .where('id', '=', params.timeEntryId)
    .execute();

  await trx
    .deleteFrom('break_events')
    .where('time_entry_id', '=', params.timeEntryId)
    .execute();

  if (params.breaks.length > 0) {
    await trx
      .insertInto('break_events')
      .values(
        params.breaks.map((b) => ({
          time_entry_id: params.timeEntryId,
          break_start_at: b.break_start_at,
          break_end_at: b.break_end_at,
        })),
      )
      .execute();
  }

  await trx
    .insertInto('audit_log')
    .values({
      time_entry_id: params.timeEntryId,
      actor_id: params.actorId,
      target_user_id: params.targetUserId,
      field_name: 'entry_edit',
      old_value: params.oldState,
      new_value: params.newState,
    })
    .execute();

  await trx
    .deleteFrom('overtime_requests')
    .where('time_entry_id', '=', params.timeEntryId)
    .execute();

  await trx
    .updateTable('correction_requests')
    .set({
      status: 'APPROVED',
      reviewed_by: params.actorId,
      reviewed_at: new Date(),
      manager_note: params.reviewerNote,
      updated_at: new Date(),
    })
    .where('id', '=', params.correctionRequestId)
    .execute();
}

export async function rejectCorrection(
  id: number,
  reviewerId: number,
  note: string | null,
): Promise<void> {
  await db
    .updateTable('correction_requests')
    .set({
      status: 'REJECTED',
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      manager_note: note,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .execute();
}
