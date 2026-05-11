import { db } from '../db/connection.js';

export async function findAllUsers() {
  return db
    .selectFrom('users')
    .select(['id', 'employee_id', 'name', 'email', 'role', 'is_active'])
    .orderBy('name', 'asc')
    .execute();
}
