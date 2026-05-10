import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('time_entries')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement().notNull())
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.id').onDelete('restrict'),
    )
    .addColumn('clock_in_at', 'datetime', (col) => col.notNull())
    .addColumn('clock_out_at', 'datetime', (col) => col)
    .addColumn('is_auto_closed_break', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_flagged', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('employee_note', 'text', (col) => col)
    .addColumn('created_at', 'datetime', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex('idx_time_entries_user_id')
    .on('time_entries')
    .column('user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('time_entries').execute();
}
