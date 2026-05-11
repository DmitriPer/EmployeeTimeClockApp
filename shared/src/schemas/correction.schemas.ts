import { z } from 'zod';

export const CorrectionSchema = z.object({
  field: z.enum(['clock_in_at', 'clock_out_at', 'break_end_at']),
  value: z.string().datetime({ offset: true }),
});

export type CorrectionDto = z.infer<typeof CorrectionSchema>;