import { z } from 'zod';

export const LoginSchema = z.object({
  employeeId: z.string().min(1).max(50),
  password: z.string().min(8).max(100),
});

export type LoginDto = z.infer<typeof LoginSchema>;
