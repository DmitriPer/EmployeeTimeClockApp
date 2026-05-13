import { api } from './client.js';
import type { ClockStatusDto, ClockOutSummaryDto, ApiSuccess } from '@app/shared';

// Legacy aliases — remove once all callers use the Dto names.
export type ClockStatusData = ClockStatusDto;
export type ClockOutData = ClockOutSummaryDto;

export async function fetchStatus(): Promise<ClockStatusDto> {
  const { data } = await api.get<ApiSuccess<ClockStatusDto>>('/timeclock/status');
  return data.data;
}

export async function clockIn(): Promise<ClockStatusDto> {
  const { data } = await api.post<ApiSuccess<ClockStatusDto>>('/timeclock/clock-in');
  return data.data;
}

export async function clockOut(): Promise<ClockOutSummaryDto> {
  const { data } = await api.post<ApiSuccess<ClockOutSummaryDto>>('/timeclock/clock-out');
  return data.data;
}

export async function startBreak(): Promise<ClockStatusDto> {
  const { data } = await api.post<ApiSuccess<ClockStatusDto>>('/timeclock/break/start');
  return data.data;
}

export async function endBreak(): Promise<ClockStatusDto> {
  const { data } = await api.post<ApiSuccess<ClockStatusDto>>('/timeclock/break/end');
  return data.data;
}
