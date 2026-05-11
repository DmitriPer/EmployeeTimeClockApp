import { db } from '../db/connection.js';
import type { Transaction } from 'kysely';
import type { Database } from '../db/types.js';

export async function findTimeEntryById(id: number) {
  return db
    .selectFrom('time_entries')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
}

export async function findLastBreakByEntryId(timeEntryId: number) {
  return db
    .selectFrom('break_events')
    .selectAll()
    .where('time_entry_id', '=', timeEntryId)
    .orderBy('break_start_at', 'desc')
    .executeTakeFirst();
}

export async function updateTimeEntryField(
  trx: Transaction<Database>,
  id: number,
  field: 'clock_in_at' | 'clock_out_at',
  value: Date,
): Promise<void> {
  await trx
    .updateTable('time_entries')
    .set(field === 'clock_in_at' ? { clock_in_at: value } : { clock_out_at: value })
    .where('id', '=', id)
    .execute();
}

export async function updateBreakEndAt(
  trx: Transaction<Database>,
  breakId: number,
  value: Date,
): Promise<void> {
  await trx
    .updateTable('break_events')
    .set({ break_end_at: value })
    .where('id', '=', breakId)
    .execute();
}

export async function insertAuditLog(
  trx: Transaction<Database>,
  params: {
    timeEntryId: number;
    actorId: number;
    targetUserId: number;
    fieldName: string;
    oldValue: string;
    newValue: string;
  },
): Promise<number> {
  const result = await trx
    .insertInto('audit_log')
    .values({
      time_entry_id: params.timeEntryId,
      actor_id: params.actorId,
      target_user_id: params.targetUserId,
      field_name: params.fieldName,
      old_value: params.oldValue,
      new_value: params.newValue,
    })
    .executeTakeFirstOrThrow();
  return Number(result.insertId);
}

export async function findAuditLogByEntryId(timeEntryId: number) {
  return db
    .selectFrom('audit_log as al')
    .innerJoin('users as actor', 'actor.id', 'al.actor_id')
    .select([
      'al.id',
      'al.field_name',
      'al.old_value',
      'al.new_value',
      'al.created_at',
      'actor.name as actor_name',
    ])
    .where('al.time_entry_id', '=', timeEntryId)
    .orderBy('al.created_at', 'asc')
    .execute();
}