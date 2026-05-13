import type { UserRole } from '../../enums/UserRole.js';

export interface UserSummaryDto {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  managerId: number | null;
}

export interface OwnProfileDto {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  managerId: number | null;
  managerName: string | null;
}

export interface CreateUserPayload {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  managerId?: number | null;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  managerId?: number | null;
}
