import { z } from 'zod';
import { UserRole } from '../enums/UserRole.js';

export const CreateUserSchema = z.object({
  employeeId: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.nativeEnum(UserRole),
  managerId: z.number().int().positive().nullable().optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  managerId: z.number().int().positive().nullable().optional(),
});

export const ResetPasswordSchema = z.object({
  password: z.string().min(8).max(100),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
