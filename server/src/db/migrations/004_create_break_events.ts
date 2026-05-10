import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('break_events')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement().notNull())
    .addColumn('time_entry_id', 'integer', (col) =>
      col.notNull().references('time_entries.id').onDelete('cascade'),
    )
    .addColumn('break_start_at', 'datetime', (col) => col.notNull())
    .addColumn('break_end_at', 'datetime', (col) => col)
    .execute();

  await db.schema
    .createIndex('idx_break_events_time_entry_id')
    .on('break_events')
    .column('time_entry_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('break_events').execute();
}
