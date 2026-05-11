import bcrypt from 'bcryptjs';
import { ErrorCode } from '@app/shared';
import type { CreateUserDto, UpdateUserDto, ResetPasswordDto, ChangePasswordDto } from '@app/shared';
import { AppError } from '../lib/errors.js';
import * as repo from './users.repository.js';

const BCRYPT_ROUNDS = 12;

export async function listUsers() {
  const users = await repo.findAllUsers();
  return users.map((u) => ({
    id: u.id,
    employeeId: u.employee_id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.is_active === 1,
    createdAt: u.created_at.toISOString(),
  }));
}

export async function createUser(dto: CreateUserDto) {
  const existing = await repo.findUserByEmployeeId(dto.employeeId);
  if (existing) {
    throw new AppError(
      `Employee ID ${dto.employeeId} is already taken.`,
      409,
      ErrorCode.EMPLOYEE_ID_TAKEN,
    );
  }

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  const id = await repo.insertUser({
    employeeId: dto.employeeId,
    name: dto.name,
    email: dto.email,
    passwordHash,
    role: dto.role,
  });

  return { id, employeeId: dto.employeeId, name: dto.name, role: dto.role };
}

export async function updateUser(id: number, dto: UpdateUserDto): Promise<void> {
  const user = await repo.findUserById(id);
  if (!user) {
    throw new AppError('User not found.', 404, ErrorCode.NOT_FOUND);
  }

  await repo.updateUser(id, {
    ...(dto.name !== undefined && { name: dto.name }),
    ...(dto.email !== undefined && { email: dto.email }),
    ...(dto.role !== undefined && { role: dto.role }),
  });
}

export async function resetUserPassword(id: number, dto: ResetPasswordDto): Promise<void> {
  const user = await repo.findUserById(id);
  if (!user) {
    throw new AppError('User not found.', 404, ErrorCode.NOT_FOUND);
  }

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  await repo.updateUserPasswordHash(id, passwordHash);
  await repo.deleteUserRefreshTokens(id);
}

export async function changeOwnPassword(userId: number, dto: ChangePasswordDto): Promise<void> {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404, ErrorCode.NOT_FOUND);
  }

  const valid = await bcrypt.compare(dto.currentPassword, user.password_hash);
  if (!valid) {
    throw new AppError('Current password is incorrect.', 400, ErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
  await repo.updateUserPasswordHash(userId, passwordHash);
  await repo.deleteUserRefreshTokens(userId);
}

export async function deactivateUser(requesterId: number, targetId: number): Promise<void> {
  if (requesterId === targetId) {
    throw new AppError('You cannot deactivate your own account.', 400, ErrorCode.CANNOT_DEACTIVATE_SELF);
  }

  const user = await repo.findUserById(targetId);
  if (!user) {
    throw new AppError('User not found.', 404, ErrorCode.NOT_FOUND);
  }
  if (user.is_active === 0) {
    throw new AppError('User is already inactive.', 409, ErrorCode.USER_ALREADY_INACTIVE);
  }

  await repo.deactivateUser(targetId);
  await repo.deleteUserRefreshTokens(targetId);
}
