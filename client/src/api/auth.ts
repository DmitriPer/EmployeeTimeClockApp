import { api } from './client.js';
import type { UserRole } from '@app/shared';

export interface LoginResult {
  accessToken: string;
  user: { id: number; name: string; role: UserRole };
}

export async function loginUser(employeeId: string, password: string): Promise<LoginResult> {
  const { data } = await api.post<{ success: true; data: LoginResult }>('/auth/login', {
    employeeId,
    password,
  });
  return data.data;
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}
