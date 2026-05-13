import { api } from './client.js';
import type { LoginResultDto, ApiSuccess } from '@app/shared';

// Legacy alias — remove once all callers use the Dto name.
export type LoginResult = LoginResultDto;

export async function loginUser(employeeId: string, password: string): Promise<LoginResultDto> {
  const { data } = await api.post<ApiSuccess<LoginResultDto>>('/auth/login', {
    employeeId,
    password,
  });
  return data.data;
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}
