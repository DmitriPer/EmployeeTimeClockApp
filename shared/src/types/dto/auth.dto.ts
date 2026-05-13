import type { UserRole } from '../../enums/UserRole.js';

export interface LoginResultDto {
  accessToken: string;
  user: { id: number; name: string; role: UserRole };
}

export interface LoginPayload {
  employeeId: string;
  password: string;
}
