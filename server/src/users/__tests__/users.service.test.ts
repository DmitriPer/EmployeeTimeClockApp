import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, UserRole } from '@app/shared';
import { listUsers, createUser, updateUser, deactivateUser } from '../users.service.js';

vi.mock('../users.repository.js', () => ({
  findAllUsers: vi.fn(),
  findUserById: vi.fn(),
  findUserByEmployeeId: vi.fn(),
  insertUser: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  deleteUserRefreshTokens: vi.fn(),
  countActiveReportsByManagerId: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed_password') },
}));

import * as repo from '../users.repository.js';

const activeUser = {
  id: 10,
  employee_id: 'EMP001',
  name: 'Dana Cohen',
  email: 'dana@company.com',
  password_hash: 'hash',
  role: UserRole.EMPLOYEE,
  is_active: 1,
  manager_id: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const managerUser = {
  ...activeUser,
  id: 5,
  employee_id: 'MGR001',
  role: UserRole.MANAGER,
};

beforeEach(() => vi.clearAllMocks());

describe('listUsers', () => {
  it('returns { users, total } with mapped isActive boolean and managerId', async () => {
    vi.mocked(repo.findAllUsers).mockResolvedValue([activeUser]);

    const result = await listUsers({ id: 1, role: UserRole.ADMIN });

    expect(result.total).toBe(1);
    expect(result.users[0]).toMatchObject({
      id: 10,
      employeeId: 'EMP001',
      isActive: true,
      role: UserRole.EMPLOYEE,
      managerId: null,
    });
  });
});

describe('createUser', () => {
  it('throws EMPLOYEE_ID_TAKEN when employee_id already exists', async () => {
    vi.mocked(repo.findUserByEmployeeId).mockResolvedValue({ id: 1 });

    await expect(
      createUser({ employeeId: 'EMP001', name: 'New', email: 'new@co.com', password: 'Pass1234!', role: UserRole.EMPLOYEE }),
    ).rejects.toMatchObject({ code: ErrorCode.EMPLOYEE_ID_TAKEN });
  });

  it('creates user and returns summary including managerId', async () => {
    vi.mocked(repo.findUserByEmployeeId).mockResolvedValue(undefined);
    vi.mocked(repo.insertUser).mockResolvedValue(42);

    const result = await createUser({
      employeeId: 'NEW001',
      name: 'New User',
      email: 'new@co.com',
      password: 'Pass1234!',
      role: UserRole.EMPLOYEE,
    });

    expect(result).toMatchObject({ id: 42, employeeId: 'NEW001', email: 'new@co.com', role: UserRole.EMPLOYEE, managerId: null });
    expect(repo.insertUser).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed_password' }),
    );
  });

  it('throws NOT_FOUND when managerId points to non-existent user', async () => {
    vi.mocked(repo.findUserByEmployeeId).mockResolvedValue(undefined);
    vi.mocked(repo.findUserById).mockResolvedValue(undefined);

    await expect(
      createUser({ employeeId: 'NEW001', name: 'New', email: 'new@co.com', password: 'Pass1234!', role: UserRole.EMPLOYEE, managerId: 999 }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('throws VALIDATION_ERROR when managerId points to an EMPLOYEE', async () => {
    vi.mocked(repo.findUserByEmployeeId).mockResolvedValue(undefined);
    vi.mocked(repo.findUserById).mockResolvedValue(activeUser);

    await expect(
      createUser({ employeeId: 'NEW001', name: 'New', email: 'new@co.com', password: 'Pass1234!', role: UserRole.EMPLOYEE, managerId: 10 }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('creates user with valid managerId', async () => {
    vi.mocked(repo.findUserByEmployeeId).mockResolvedValue(undefined);
    vi.mocked(repo.findUserById).mockResolvedValue(managerUser);
    vi.mocked(repo.insertUser).mockResolvedValue(42);

    const result = await createUser({
      employeeId: 'NEW001', name: 'New', email: 'new@co.com', password: 'Pass1234!',
      role: UserRole.EMPLOYEE, managerId: 5,
    });

    expect(result.managerId).toBe(5);
    expect(repo.insertUser).toHaveBeenCalledWith(expect.objectContaining({ managerId: 5 }));
  });
});

describe('updateUser', () => {
  it('throws NOT_FOUND when user does not exist', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(undefined);

    await expect(updateUser(99, { name: 'New Name' })).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });

  it('calls updateUser repo and returns updated user data', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(activeUser);
    vi.mocked(repo.updateUser).mockResolvedValue(undefined);

    const result = await updateUser(10, { name: 'Updated', role: UserRole.MANAGER });

    expect(repo.updateUser).toHaveBeenCalledWith(10, { name: 'Updated', role: UserRole.MANAGER });
    expect(result).toMatchObject({
      id: 10,
      name: 'Updated',
      email: 'dana@company.com',
      role: UserRole.MANAGER,
      isActive: true,
    });
  });

  it('updates managerId to null (unassign)', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ ...activeUser, manager_id: 5 });
    vi.mocked(repo.updateUser).mockResolvedValue(undefined);

    const result = await updateUser(10, { managerId: null });

    expect(repo.updateUser).toHaveBeenCalledWith(10, { manager_id: null });
    expect(result.managerId).toBeNull();
  });
});

describe('deactivateUser', () => {
  it('throws CANNOT_DEACTIVATE_SELF with 403 when requester targets themselves', async () => {
    await expect(deactivateUser(10, 10)).rejects.toMatchObject({
      code: ErrorCode.CANNOT_DEACTIVATE_SELF,
      statusCode: 403,
    });
  });

  it('throws NOT_FOUND when user does not exist', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(undefined);

    await expect(deactivateUser(1, 99)).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('throws MANAGER_HAS_ACTIVE_REPORTS when manager still has active employees', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(activeUser);
    vi.mocked(repo.countActiveReportsByManagerId).mockResolvedValue(3);

    await expect(deactivateUser(1, 10)).rejects.toMatchObject({
      code: ErrorCode.MANAGER_HAS_ACTIVE_REPORTS,
      statusCode: 409,
    });
  });

  it('throws USER_ALREADY_INACTIVE when already deactivated', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ ...activeUser, is_active: 0 });
    vi.mocked(repo.countActiveReportsByManagerId).mockResolvedValue(0);

    await expect(deactivateUser(1, 10)).rejects.toMatchObject({
      code: ErrorCode.USER_ALREADY_INACTIVE,
    });
  });

  it('deactivates user, invalidates refresh tokens, returns { id, isActive: false }', async () => {
    vi.mocked(repo.findUserById).mockResolvedValue(activeUser);
    vi.mocked(repo.countActiveReportsByManagerId).mockResolvedValue(0);
    vi.mocked(repo.deactivateUser).mockResolvedValue(undefined);
    vi.mocked(repo.deleteUserRefreshTokens).mockResolvedValue(undefined);

    const result = await deactivateUser(1, 10);

    expect(repo.deactivateUser).toHaveBeenCalledWith(10);
    expect(repo.deleteUserRefreshTokens).toHaveBeenCalledWith(10);
    expect(result).toEqual({ id: 10, isActive: false });
  });
});
