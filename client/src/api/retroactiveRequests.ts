import { api } from './client.js';
import type {
  RetroactiveRequestResultDto,
  SubmitRetroactiveRequestPayload,
  ApiSuccess,
} from '@app/shared';

// Legacy alias — remove once all callers use the Dto name.
export type RetroactiveRequestResult = RetroactiveRequestResultDto;

export async function submitRetroactiveRequest(
  dto: SubmitRetroactiveRequestPayload,
): Promise<RetroactiveRequestResultDto> {
  const { data } = await api.post<ApiSuccess<RetroactiveRequestResultDto>>(
    '/retroactive-requests',
    dto,
  );
  return data.data;
}

export async function getMyRetroactiveRequests(): Promise<RetroactiveRequestResultDto[]> {
  const { data } = await api.get<ApiSuccess<RetroactiveRequestResultDto[]>>(
    '/retroactive-requests',
  );
  return data.data;
}

export async function cancelRetroactiveRequest(id: number): Promise<void> {
  await api.delete(`/retroactive-requests/${id}`);
}
