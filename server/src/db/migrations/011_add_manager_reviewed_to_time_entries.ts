import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('time_entries')
    .addColumn('manager_reviewed_at', 'datetime', (col) => col.defaultTo(null))
    .execute();
  await db.schema
    .alterTable('time_entries')
    .addColumn('manager_reviewed_by', 'integer', (col) => col.defaultTo(null))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('time_entries').dropColumn('manager_reviewed_by').execute();
  await db.schema.alterTable('time_entries').dropColumn('manager_reviewed_at').execute();
}
