import { api } from './client.js';
import type {
  UserSummaryDto,
  OwnProfileDto,
  CreateUserPayload,
  UpdateUserPayload,
  ApiSuccess,
} from '@app/shared';

// Legacy aliases — remove once all callers use the Dto names.
export type UserSummary = UserSummaryDto;
export type OwnProfile = OwnProfileDto;
export type { CreateUserPayload, UpdateUserPayload } from '@app/shared';

export async function fetchOwnProfile(): Promise<OwnProfileDto> {
  const { data } = await api.get<ApiSuccess<OwnProfileDto>>('/users/me');
  return data.data;
}

export async function fetchUsers(): Promise<UserSummaryDto[]> {
  const { data } = await api.get<ApiSuccess<{ users: UserSummaryDto[]; total: number }>>('/users');
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
