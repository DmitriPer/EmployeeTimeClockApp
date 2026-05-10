import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('overtime_requests')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement().notNull())
    .addColumn('time_entry_id', 'integer', (col) =>
      col.notNull().references('time_entries.id').onDelete('restrict'),
    )
    .addColumn('user_id', 'integer', (col) =>
      col.notNull().references('users.id').onDelete('restrict'),
    )
    .addColumn('status', sql`ENUM('PENDING', 'APPROVED', 'REJECTED')`, (col) =>
      col.notNull().defaultTo('PENDING'),
    )
    .addColumn('overtime_minutes', 'integer', (col) => col.notNull())
    .addColumn('manager_note', 'text', (col) => col)
    .addColumn('reviewed_by', 'integer', (col) => col.references('users.id'))
    .addColumn('reviewed_at', 'datetime', (col) => col)
    .addColumn('created_at', 'datetime', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex('idx_overtime_requests_user_id')
    .on('overtime_requests')
    .column('user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('overtime_requests').execute();
}
