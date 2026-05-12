import { z } from 'zod';

export const CorrectionSchema = z.object({
  field: z.enum(['clock_in_at', 'clock_out_at', 'break_end_at']),
  value: z.string().datetime({ offset: true }),
});

export type CorrectionDto = z.infer<typeof CorrectionSchema>;

const BreakRequestSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS'),
  end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS'),
});

export const CorrectionRequestSchema = z.object({
  timeEntryId: z.number().int().positive(),
  clockInTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  clockOutTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  breaks: z.array(BreakRequestSchema).optional(),
  employeeNote: z.string().min(1, 'An explanation is required').max(2000),
});

export const UpdateCorrectionRequestSchema = z.object({
  clockInTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  clockOutTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  breaks: z.array(BreakRequestSchema).optional(),
  employeeNote: z.string().min(1).max(2000).optional(),
});

export const ReviewCorrectionRequestSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(2000).nullable().optional(),
});

export type CorrectionRequestDto = z.infer<typeof CorrectionRequestSchema>;
export type UpdateCorrectionRequestDto = z.infer<typeof UpdateCorrectionRequestSchema>;
export type ReviewCorrectionRequestDto = z.infer<typeof ReviewCorrectionRequestSchema>;
export type BreakRequest = z.infer<typeof BreakRequestSchema>;