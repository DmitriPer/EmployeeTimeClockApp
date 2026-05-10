import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';
import { env } from '../config/env.js';
import type { Database } from './types.js';

const dialect = new MysqlDialect({
  pool: createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    connectionLimit: 20,
  }),
});

export const db = new Kysely<Database>({ dialect });
