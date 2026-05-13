import type { Response } from 'express';

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

export function sendOk<T>(res: Response, data: T): void {
  res.status(200).json({ success: true, data } satisfies SuccessEnvelope<T>);
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data } satisfies SuccessEnvelope<T>);
}

export function sendEmpty(res: Response, status: 200 | 201 = 200): void {
  res.status(status).json({ success: true, data: null });
}
