import { db } from '../db/connection.js';
import type { Transaction } from 'kysely';
import type { Database } from '../db/types.js';

export async function findOpenSession(userId: number) {
  return db
    .selectFrom('time_entries')
    .selectAll()
    .where('user_id', '=', userId)
    .where('clock_out_at', 'is', null)
    .executeTakeFirst();
}

export async function insertTimeEntry(
  userId: number,
  clockInAt: Date,
): Promise<number> {
  const result = await db
    .insertInto('time_entries')
    .values({ user_id: userId, clock_in_at: clockInAt })
    .executeTakeFirstOrThrow();
  return Number(result.insertId);
}

export async function closeTimeEntry(
  trx: Transaction<Database>,
  id: number,
  clockOutAt: Date,
  isAutoClosedBreak: boolean,
  isFlagged: boolean,
): Promise<void> {
  await trx
    .updateTable('time_entries')
    .set({
      clock_out_at: clockOutAt,
      is_auto_closed_break: isAutoClosedBreak ? 1 : 0,
      is_flagged: isFlagged ? 1 : 0,
    })
    .where('id', '=', id)
    .execute();
}

export async function findOpenBreak(timeEntryId: number) {
  return db
    .selectFrom('break_events')
    .selectAll()
    .where('time_entry_id', '=', timeEntryId)
    .where('break_end_at', 'is', null)
    .executeTakeFirst();
}

export async function insertBreakEvent(
  timeEntryId: number,
  breakStartAt: Date,
): Promise<number> {
  const result = await db
    .insertInto('break_events')
    .values({ time_entry_id: timeEntryId, break_start_at: breakStartAt })
    .executeTakeFirstOrThrow();
  return Number(result.insertId);
}

export async function closeBreakEvent(
  trx: Transaction<Database>,
  id: number,
  breakEndAt: Date,
): Promise<void> {
  await trx
    .updateTable('break_events')
    .set({ break_end_at: breakEndAt })
    .where('id', '=', id)
    .execute();
}

export async function findBreaksByEntryId(timeEntryId: number) {
  return db
    .selectFrom('break_events')
    .selectAll()
    .where('time_entry_id', '=', timeEntryId)
    .execute();
}

export async function findBreaksByEntryIdTrx(
  trx: Transaction<Database>,
  timeEntryId: number,
) {
  return trx
    .selectFrom('break_events')
    .selectAll()
    .where('time_entry_id', '=', timeEntryId)
    .execute();
}

export async function insertOvertimeRequest(
  trx: Transaction<Database>,
  params: { timeEntryId: number; userId: number; overtimeMinutes: number },
): Promise<void> {
  await trx
    .insertInto('overtime_requests')
    .values({
      time_entry_id: params.timeEntryId,
      user_id: params.userId,
      overtime_minutes: params.overtimeMinutes,
    })
    .execute();
}
