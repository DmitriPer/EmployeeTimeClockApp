import { db } from '../db/connection.js';
import { sql } from 'kysely';

export async function findFlaggedSessions(managerId?: number, userId?: number) {
  return db
    .selectFrom('time_entries as te')
    .innerJoin('users as u', 'u.id', 'te.user_id')
    .leftJoin('audit_log as al', 'al.time_entry_id', 'te.id')
    .leftJoin('break_events as be', 'be.time_entry_id', 'te.id')
    .leftJoin('users as reviewer', 'reviewer.id', 'te.manager_reviewed_by')
    .select([
      'te.id',
      'te.user_id',
      'te.clock_in_at',
      'te.clock_out_at',
      'te.manager_reviewed_at',
      'te.manager_reviewed_by',
      'u.name as employee_name',
      'u.employee_id as employee_id',
      sql<number>`COUNT(DISTINCT al.id)`.as('correction_count'),
      sql<Date | null>`MAX(be.break_start_at)`.as('break_start_at'),
      sql<Date | null>`MAX(be.break_end_at)`.as('break_end_at'),
      sql<string | null>`MAX(reviewer.name)`.as('reviewed_by_name'),
    ])
    .where('te.is_flagged', '=', 1)
    .$if(managerId !== undefined, (qb) => qb.where('u.manager_id', '=', managerId!))
    .$if(userId !== undefined, (qb) => qb.where('te.user_id', '=', userId!))
    .groupBy([
      'te.id', 'te.user_id', 'te.clock_in_at', 'te.clock_out_at',
      'te.manager_reviewed_at', 'te.manager_reviewed_by',
      'u.name', 'u.employee_id',
    ])
    .orderBy('te.clock_in_at', 'desc')
    .execute();
}

export async function findFlaggedEntryWithBreak(timeEntryId: number) {
  return db
    .selectFrom('time_entries as te')
    .innerJoin('users as u', 'u.id', 'te.user_id')
    .leftJoin('break_events as be', 'be.time_entry_id', 'te.id')
    .select([
      'te.id',
      'te.user_id',
      'te.clock_in_at',
      'te.clock_out_at',
      'te.is_flagged',
      'u.manager_id',
      'be.id as break_id',
      'be.break_start_at',
      'be.break_end_at',
    ])
    .where('te.id', '=', timeEntryId)
    .executeTakeFirst();
}

export async function updateFlaggedSessionReview(params: {
  timeEntryId: number;
  newBreakEndAt: Date;
  actorId: number;
  targetUserId: number;
  oldBreakEndAt: string;
}): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('break_events')
      .set({ break_end_at: params.newBreakEndAt })
      .where('time_entry_id', '=', params.timeEntryId)
      .execute();

    await trx
      .insertInto('audit_log')
      .values({
        time_entry_id: params.timeEntryId,
        actor_id: params.actorId,
        target_user_id: params.targetUserId,
        field_name: 'break_end_at',
        old_value: params.oldBreakEndAt,
        new_value: params.newBreakEndAt.toISOString(),
      })
      .execute();

    await trx
      .updateTable('time_entries')
      .set({ manager_reviewed_at: new Date(), manager_reviewed_by: params.actorId, is_flagged: 0 })
      .where('id', '=', params.timeEntryId)
      .execute();
  });
}
