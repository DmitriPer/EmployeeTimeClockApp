import crypto from 'crypto';
import { db } from '../db/connection.js';

export async function findUserByEmployeeId(employeeId: string) {
  return db
    .selectFrom('users')
    .selectAll()
    .where('employee_id', '=', employeeId)
    .executeTakeFirst();
}

export async function deleteUserRefreshTokens(userId: number): Promise<void> {
  await db.deleteFrom('refresh_tokens').where('user_id', '=', userId).execute();
}

export async function insertRefreshToken(params: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await db
    .insertInto('refresh_tokens')
    .values({
      user_id: params.userId,
      token_hash: params.tokenHash,
      expires_at: params.expiresAt,
    })
    .execute();
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}