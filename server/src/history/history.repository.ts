import { db } from '../db/connection.js';

export async function findEntriesForUser(params: {
  userId: number;
  fromUtc?: Date;
  toUtc?: Date;
}) {
  let query = db
    .selectFrom('time_entries')
    .selectAll()
    .where('user_id', '=', params.userId)
    .orderBy('clock_in_at', 'desc');

  if (params.fromUtc) {
    query = query.where('clock_in_at', '>=', params.fromUtc);
  }
  if (params.toUtc) {
    query = query.where('clock_in_at', '<=', params.toUtc);
  }

  return query.execute();
}

export async function findBreaksByEntryIds(entryIds: number[]) {
  if (entryIds.length === 0) return [];
  return db
    .selectFrom('break_events')
    .selectAll()
    .where('time_entry_id', 'in', entryIds)
    .execute();
}

export async function findOvertimeByEntryIds(entryIds: number[]) {
  if (entryIds.length === 0) return [];
  return db
    .selectFrom('overtime_requests')
    .selectAll()
    .where('time_entry_id', 'in', entryIds)
    .execute();
}

export async function findEntryById(id: number) {
  return db
    .selectFrom('time_entries')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
}

export async function findCorrectedEntryIds(entryIds: number[]): Promise<number[]> {
  if (entryIds.length === 0) return [];
  const rows = await db
    .selectFrom('audit_log')
    .select('time_entry_id')
    .where('time_entry_id', 'in', entryIds)
    .where('field_name', '=', 'entry_edit')
    .execute();
  return rows.map((r) => r.time_entry_id);
}

export async function updateEntryNote(id: number, note: string | null): Promise<void> {
  await db
    .updateTable('time_entries')
    .set({ employee_note: note })
    .where('id', '=', id)
    .execute();
}
