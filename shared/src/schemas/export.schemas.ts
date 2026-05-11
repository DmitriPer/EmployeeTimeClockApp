import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format');

export const ExportQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  format: z.enum(['pdf', 'csv', 'xls']),
  employeeId: z.coerce.number().int().positive().optional(),
});

export type ExportQueryDto = z.infer<typeof ExportQuerySchema>;
