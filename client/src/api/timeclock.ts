import { api } from './client.js';
import { ClockStatus } from '@app/shared';

export interface ClockStatusData {
  status: ClockStatus;
  entryId?: number;
  clockInAt?: string;
  breakStartAt?: string | null;
  totalBreakMinutes: number;
  grossMinutes?: number;
}

export interface ClockOutData {
  entryId: number;
  clockInAt: string;
  clockOutAt: string;
  grossMinutes: number;
  totalBreakMinutes: number;
  excessBreakMinutes: number;
  paidMinutes: number;
  isAutoClosedBreak: boolean;
  isFlagged: boolean;
  overtimeMinutes: number;
}

export async function fetchStatus(): Promise<ClockStatusData> {
  const { data } = await api.get<{ success: true; data: ClockStatusData }>('/timeclock/status');
  return data.data;
}

export async function clockIn(): Promise<ClockStatusData> {
  const { data } = await api.post<{ success: true; data: ClockStatusData }>('/timeclock/clock-in');
  return data.data;
}

export async function clockOut(): Promise<ClockOutData> {
  const { data } = await api.post<{ success: true; data: ClockOutData }>('/timeclock/clock-out');
  return data.data;
}

export async function startBreak(): Promise<ClockStatusData> {
  const { data } = await api.post<{ success: true; data: ClockStatusData }>('/timeclock/break/start');
  return data.data;
}

export async function endBreak(): Promise<ClockStatusData> {
  const { data } = await api.post<{ success: true; data: ClockStatusData }>('/timeclock/break/end');
  return data.data;
}
