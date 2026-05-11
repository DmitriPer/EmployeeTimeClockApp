import { api } from './client.js';
import type { UserRole } from '@app/shared';

export interface UserSummary {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  managerId: number | null;
}

export interface OwnProfile {
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

export async function fetchOwnProfile(): Promise<OwnProfile> {
  const { data } = await api.get<{ success: true; data: OwnProfile }>('/users/me');
  return data.data;
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const { data } = await api.get<{ success: true; data: { users: UserSummary[]; total: number } }>('/users');
  return data.data.users;
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  await api.post('/users', payload);
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<void> {
  await api.patch(`/users/${id}`, payload);
}

export async function deactivateUser(id: number): Promise<void> {
  await api.patch(`/users/${id}/deactivate`);
}

export async function resetUserPassword(id: number, password: string): Promise<void> {
  await api.patch(`/users/${id}/reset-password`, { password });
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.patch('/users/me/password', { currentPassword, newPassword });
}
