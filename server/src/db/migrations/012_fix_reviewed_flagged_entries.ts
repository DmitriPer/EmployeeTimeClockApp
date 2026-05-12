import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db
    .updateTable('time_entries')
    .set({ is_flagged: 0 })
    .where('manager_reviewed_at', 'is not', null)
    .where('is_flagged', '=', 1)
    .execute();
}

export async function down(_db: Kysely<any>): Promise<void> {}
