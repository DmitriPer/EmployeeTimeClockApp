import { api } from './client.js';
import type { UserRole } from '@app/shared';

export interface UserSummary {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: number;
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const { data } = await api.get<{ success: true; data: UserSummary[] }>('/users');
  return data.data;
}
