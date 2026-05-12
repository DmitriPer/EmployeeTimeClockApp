import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('retroactive_entry_requests')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement().notNull())
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('requested_date', 'date', (col) => col.notNull())
    .addColumn('clock_in_time', 'time', (col) => col.notNull())
    .addColumn('clock_out_time', 'time', (col) => col.notNull())
    .addColumn('breaks_json', 'text')
    .addColumn('employee_note', 'text', (col) => col.notNull())
    .addColumn('status', 'varchar(16)', (col) => col.notNull().defaultTo('PENDING'))
    .addColumn('reviewed_by', 'integer', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('reviewed_at', 'datetime')
    .addColumn('manager_note', 'text')
    .addColumn('created_at', 'datetime', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_retroactive_requests_user_id')
    .on('retroactive_entry_requests')
    .column('user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('retroactive_entry_requests').execute();
}
