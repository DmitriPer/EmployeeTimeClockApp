import { db } from '../db/connection.js';
import type { UserRole } from '@app/shared';

export async function findAllUsers() {
  return db
    .selectFrom('users')
    .select(['id', 'employee_id', 'name', 'email', 'role', 'is_active', 'manager_id', 'created_at'])
    .orderBy('name', 'asc')
    .execute();
}

export async function findUserById(id: number) {
  return db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
}

export async function findUserByEmployeeId(employeeId: string) {
  return db
    .selectFrom('users')
    .select('id')
    .where('employee_id', '=', employeeId)
    .executeTakeFirst();
}

export async function insertUser(params: {
  employeeId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  managerId?: number | null;
}): Promise<number> {
  const result = await db
    .insertInto('users')
    .values({
      employee_id: params.employeeId,
      name: params.name,
      email: params.email,
      password_hash: params.passwordHash,
      role: params.role,
      ...(params.managerId !== undefined && { manager_id: params.managerId }),
    })
    .executeTakeFirstOrThrow();
  return Number(result.insertId);
}

export async function updateUser(
  id: number,
  fields: { name?: string; email?: string; role?: UserRole; manager_id?: number | null },
): Promise<void> {
  await db.updateTable('users').set(fields).where('id', '=', id).execute();
}

export async function updateUserPasswordHash(id: number, passwordHash: string): Promise<void> {
  await db.updateTable('users').set({ password_hash: passwordHash }).where('id', '=', id).execute();
}

export async function deactivateUser(id: number): Promise<void> {
  await db.updateTable('users').set({ is_active: 0 }).where('id', '=', id).execute();
}

export async function deleteUserRefreshTokens(userId: number): Promise<void> {
  await db.deleteFrom('refresh_tokens').where('user_id', '=', userId).execute();
}

export async function countActiveReportsByManagerId(managerId: number): Promise<number> {
  const result = await db
    .selectFrom('users')
    .select(db.fn.count<number>('id').as('count'))
    .where('manager_id', '=', managerId)
    .where('is_active', '=', 1)
    .executeTakeFirstOrThrow();
  return Number(result.count);
}
