import bcrypt from 'bcryptjs';
import { ErrorCode, UserRole } from '@app/shared';
import type { CreateUserDto, UpdateUserDto, ResetPasswordDto, ChangePasswordDto } from '@app/shared';
import { AppError } from '../lib/errors.js';
import * as repo from './users.repository.js';

const BCRYPT_ROUNDS = 12;

async function validateManagerId(managerId: number | null | undefined): Promise<void> {
  if (managerId == null) return;
  const manager = await repo.findUserById(managerId);
  if (!manager) {
    throw new AppError('Manager not found.', 404, ErrorCode.NOT_FOUND);
  }
  if (manager.role === UserRole.EMPLOYEE) {
    throw new AppError('Assigned manager must have MANAGER or ADMIN role.', 400, ErrorCode.VALIDATION_ERROR);
  }
}

export async function listUsers(requester: { id: number; role: UserRole }) {
  const rows =
    requester.role === UserRole.ADMIN
      ? await repo.findAllUsers()
      : await repo.findUsersForManager(requester.id);
  const users = rows.map((u) => ({
    id: u.id,
    employeeId: u.employee_id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.is_active === 1,
    createdAt: u.created_at.toISOString(),
    managerId: u.manager_id ?? null,
  }));
  return { users, total: users.length };
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

  await validateManagerId(dto.managerId);

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  const id = await repo.insertUser({
    employeeId: dto.employeeId,
    name: dto.name,
    email: dto.email,
    passwordHash,
    role: dto.role,
    managerId: dto.managerId,
  });

  return {
    id,
    employeeId: dto.employeeId,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    managerId: dto.managerId ?? null,
  };
}

export async function updateUser(id: number, dto: UpdateUserDto) {
  const user = await repo.findUserById(id);
  if (!user) {
    throw new AppError('User not found.', 404, ErrorCode.NOT_FOUND);
  }

  await validateManagerId(dto.managerId);

  const updates = {
    ...(dto.name !== undefined && { name: dto.name }),
    ...(dto.email !== undefined && { email: dto.email }),
    ...(dto.role !== undefined && { role: dto.role }),
    ...(dto.managerId !== undefined && { manager_id: dto.managerId }),
  };

  await repo.updateUser(id, updates);

  const updatedManagerId = updates.manager_id !== undefined ? updates.manager_id : (user.manager_id ?? null);

  return {
    id,
    name: updates.name ?? user.name,
    email: updates.email ?? user.email,
    role: updates.role ?? user.role,
    isActive: user.is_active === 1,
    managerId: updatedManagerId,
  };
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

export async function getOwnProfile(userId: number) {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404, ErrorCode.NOT_FOUND);
  }
  let managerName: string | null = null;
  if (user.manager_id) {
    const manager = await repo.findUserById(user.manager_id);
    managerName = manager?.name ?? null;
  }
  return {
    id: user.id,
    employeeId: user.employee_id,
    name: user.name,
    email: user.email,
    role: user.role,
    managerId: user.manager_id ?? null,
    managerName,
  };
}

export async function deactivateUser(requesterId: number, targetId: number) {
  if (requesterId === targetId) {
    throw new AppError('You cannot deactivate your own account.', 403, ErrorCode.CANNOT_DEACTIVATE_SELF);
  }

  const user = await repo.findUserById(targetId);
  if (!user) {
    throw new AppError('User not found.', 404, ErrorCode.NOT_FOUND);
  }

  const activeReports = await repo.countActiveReportsByManagerId(targetId);
  if (activeReports > 0) {
    throw new AppError(
      'Reassign or deactivate all employees assigned to this manager before deactivating.',
      409,
      ErrorCode.MANAGER_HAS_ACTIVE_REPORTS,
    );
  }

  if (user.is_active === 0) {
    throw new AppError('User is already inactive.', 409, ErrorCode.USER_ALREADY_INACTIVE);
  }

  await repo.deactivateUser(targetId);
  await repo.deleteUserRefreshTokens(targetId);

  return { id: targetId, isActive: false as const };
}
