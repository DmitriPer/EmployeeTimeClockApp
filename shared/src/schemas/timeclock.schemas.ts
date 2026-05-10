import { z } from 'zod';

export const ClockInSchema = z.object({}).strict();

export const ClockOutSchema = z.object({}).strict();

export const BreakStartSchema = z.object({}).strict();

export const BreakEndSchema = z.object({}).strict();

export const NoteSchema = z.object({
  note: z.string().max(1000),
});

export type ClockInDto = z.infer<typeof ClockInSchema>;
export type ClockOutDto = z.infer<typeof ClockOutSchema>;
export type NoteDto = z.infer<typeof NoteSchema>;
