import { db } from '../db/connection.js';

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
