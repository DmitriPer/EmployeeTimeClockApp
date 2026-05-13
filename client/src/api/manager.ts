import { api } from './client.js';
import type {
  OvertimeRequestDto,
  FlaggedSessionDto,
  ManagerCorrectionRequestDto,
  ManagerRetroactiveRequestDto,
  ReviewAction,
  ApiSuccess,
} from '@app/shared';

// Legacy aliases — remove once all callers use the Dto names.
export type OvertimeRequest = OvertimeRequestDto;
export type FlaggedSession = FlaggedSessionDto;
export type CorrectionRequest = ManagerCorrectionRequestDto;
export type PendingRetroactiveRequest = ManagerRetroactiveRequestDto;

export async function fetchOvertimeQueue(): Promise<OvertimeRequestDto[]> {
  const { data } = await api.get<ApiSuccess<OvertimeRequestDto[]>>('/manager/overtime');
  return data.data;
}

export async function reviewOvertime(
  id: number,
  action: ReviewAction,
  note: string | null,
): Promise<void> {
  await api.patch(`/manager/overtime/${id}/review`, { action, note });
}

export async function fetchFlaggedSessions(): Promise<FlaggedSessionDto[]> {
  const { data } = await api.get<ApiSuccess<{ sessions: FlaggedSessionDto[]; total: number }>>('/manager/flagged');
  return data.data.sessions;
}

export async function reviewFlaggedSession(timeEntryId: number, breakEndTime: string): Promise<void> {
  await api.patch(`/manager/flagged/${timeEntryId}/review`, { breakEndTime });
}

export async function fetchCorrectionQueue(): Promise<ManagerCorrectionRequestDto[]> {
  const { data } = await api.get<ApiSuccess<ManagerCorrectionRequestDto[]>>(
    '/manager/correction-requests',
  );
  return data.data;
}

export async function reviewCorrectionRequest(
  id: number,
  action: ReviewAction,
  note: string | null,
): Promise<void> {
  await api.patch(`/manager/correction-requests/${id}/review`, { action, note });
}

export async function fetchRetroactiveQueue(): Promise<ManagerRetroactiveRequestDto[]> {
  const { data } = await api.get<ApiSuccess<ManagerRetroactiveRequestDto[]>>(
    '/manager/retroactive-requests',
  );
  return data.data;
}

export async function reviewRetroactiveRequest(
  id: number,
  action: ReviewAction,
  note: string | null,
): Promise<void> {
  await api.patch(`/manager/retroactive-requests/${id}/review`, { action, note });
}
