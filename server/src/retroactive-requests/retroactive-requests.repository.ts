import { db } from '../db/connection.js';

export async function findPendingRetroactiveRequestByUserId(userId: number) {
  return db
    .selectFrom('retroactive_entry_requests')
    .selectAll()
    .where('user_id', '=', userId)
    .where('status', '=', 'PENDING')
    .executeTakeFirst();
}

export async function findRetroactiveRequestsByUserId(userId: number) {
  return db
    .selectFrom('retroactive_entry_requests')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('requested_date', 'desc')
    .execute();
}

export async function findRetroactiveRequestById(id: number) {
  return db
    .selectFrom('retroactive_entry_requests')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
}

export async function insertRetroactiveRequest(params: {
  userId: number;
  requestedDate: string;
  clockInTime: string;
  clockOutTime: string;
  breaksJson: string | null;
  employeeNote: string;
}) {
  const result = await db
    .insertInto('retroactive_entry_requests')
    .values({
      user_id: params.userId,
      requested_date: params.requestedDate,
      clock_in_time: params.clockInTime,
      clock_out_time: params.clockOutTime,
      breaks_json: params.breaksJson,
      employee_note: params.employeeNote,
    })
    .executeTakeFirstOrThrow();
  return Number(result.insertId);
}

export async function deleteRetroactiveRequest(id: number): Promise<void> {
  await db.deleteFrom('retroactive_entry_requests').where('id', '=', id).execute();
}

export async function findPendingRetroactiveRequests(managerId?: number) {
  let query = db
    .selectFrom('retroactive_entry_requests as r')
    .innerJoin('users as u', 'u.id', 'r.user_id')
    .select([
      'r.id',
      'r.user_id',
      'r.requested_date',
      'r.clock_in_time',
      'r.clock_out_time',
      'r.breaks_json',
      'r.employee_note',
      'r.created_at',
      'u.name as employee_name',
      'u.employee_id as employee_id',
    ])
    .where('r.status', '=', 'PENDING');

  if (managerId !== undefined) {
    query = query.where((eb) =>
      eb.or([
        eb('u.manager_id', '=', managerId),
        eb.and([
          eb('u.role', 'in', ['MANAGER', 'ADMIN']),
          eb('r.user_id', '!=', managerId),
        ]),
      ]),
    ) as typeof query;
  } else {
    // ADMIN — exclude own requests
    query = query.where('r.user_id', '!=', managerId ?? 0) as typeof query;
  }

  return query.orderBy('r.created_at', 'asc').execute();
}

export async function approveRetroactiveRequest(
  id: number,
  reviewerId: number,
  managerNote: string | null,
) {
  await db
    .updateTable('retroactive_entry_requests')
    .set({ status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date(), manager_note: managerNote })
    .where('id', '=', id)
    .execute();
}

export async function rejectRetroactiveRequest(
  id: number,
  reviewerId: number,
  managerNote: string | null,
) {
  await db
    .updateTable('retroactive_entry_requests')
    .set({ status: 'REJECTED', reviewed_by: reviewerId, reviewed_at: new Date(), manager_note: managerNote })
    .where('id', '=', id)
    .execute();
}
