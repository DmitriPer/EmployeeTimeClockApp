import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('audit_log')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement().notNull())
    .addColumn('time_entry_id', 'integer', (col) =>
      col.notNull().references('time_entries.id').onDelete('restrict'),
    )
    .addColumn('actor_id', 'integer', (col) =>
      col.notNull().references('users.id').onDelete('restrict'),
    )
    .addColumn('target_user_id', 'integer', (col) =>
      col.notNull().references('users.id').onDelete('restrict'),
    )
    .addColumn('field_name', 'varchar(100)', (col) => col.notNull())
    .addColumn('old_value', 'text', (col) => col.notNull())
    .addColumn('new_value', 'text', (col) => col.notNull())
    .addColumn('created_at', 'datetime', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex('idx_audit_log_time_entry_id')
    .on('audit_log')
    .column('time_entry_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('audit_log').execute();
}
