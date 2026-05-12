import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('correction_requests')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement().notNull())
    .addColumn('time_entry_id', 'integer', (col) =>
      col.notNull().references('time_entries.id').onDelete('cascade'),
    )
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('requested_clock_in_at', 'datetime', (col) => col.notNull())
    .addColumn('requested_clock_out_at', 'datetime')
    .addColumn('requested_breaks_json', 'text')
    .addColumn('employee_note', 'text', (col) => col.notNull())
    .addColumn('status', 'varchar(16)', (col) => col.notNull().defaultTo('PENDING'))
    .addColumn('reviewed_by', 'integer', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('reviewed_at', 'datetime')
    .addColumn('manager_note', 'text')
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_correction_requests_time_entry_id')
    .on('correction_requests')
    .column('time_entry_id')
    .execute();

  await db.schema
    .createIndex('idx_correction_requests_user_id')
    .on('correction_requests')
    .column('user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('correction_requests').execute();
}
