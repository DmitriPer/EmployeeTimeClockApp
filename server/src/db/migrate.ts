import { Migrator } from 'kysely/migration';
import { db } from './connection.js';
import * as m001 from './migrations/001_create_users.js';
import * as m002 from './migrations/002_create_refresh_tokens.js';
import * as m003 from './migrations/003_create_time_entries.js';
import * as m004 from './migrations/004_create_break_events.js';
import * as m005 from './migrations/005_create_overtime_requests.js';
import * as m006 from './migrations/006_create_audit_log.js';
import * as m007 from './migrations/007_add_manager_id_to_users.js';
import * as m008 from './migrations/008_create_correction_requests.js';
import * as m009 from './migrations/009_create_retroactive_entry_requests.js';
import * as m010 from './migrations/010_add_is_retroactive_to_time_entries.js';
import * as m011 from './migrations/011_add_manager_reviewed_to_time_entries.js';
import * as m012 from './migrations/012_fix_reviewed_flagged_entries.js';

async function migrateToLatest(): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: {
      getMigrations() {
        return Promise.resolve({
          '001_create_users': m001,
          '002_create_refresh_tokens': m002,
          '003_create_time_entries': m003,
          '004_create_break_events': m004,
          '005_create_overtime_requests': m005,
          '006_create_audit_log': m006,
          '007_add_manager_id_to_users': m007,
          '008_create_correction_requests': m008,
          '009_create_retroactive_entry_requests': m009,
          '010_add_is_retroactive_to_time_entries': m010,
          '011_add_manager_reviewed_to_time_entries': m011,
          '012_fix_reviewed_flagged_entries': m012,
        });
      },
    },
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((result) => {
    if (result.status === 'Success') {
      console.log(`✅  ${result.migrationName}`);
    } else if (result.status === 'Error') {
      console.error(`❌  ${result.migrationName}`);
    }
  });

  if (!results || results.length === 0) {
    console.log('✅  Already up to date — no new migrations');
  }

  if (error) {
    console.error('\nMigration failed:', error);
    await db.destroy();
    process.exit(1);
  }

  console.log('\n✅  All migrations complete');
  await db.destroy();
}

migrateToLatest();
