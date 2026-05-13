import { api } from './client.js';
import type {
  BreakInputDto,
  CorrectionRequestResultDto,
  SubmitCorrectionRequestPayload,
  UpdateCorrectionRequestPayload,
  ApiSuccess,
} from '@app/shared';

// Legacy aliases — remove once all callers use the Dto names.
export type BreakInput = BreakInputDto;
export type CorrectionRequestResult = CorrectionRequestResultDto;

export async function submitCorrectionRequest(
  dto: SubmitCorrectionRequestPayload,
): Promise<CorrectionRequestResultDto> {
  const { data } = await api.post<ApiSuccess<CorrectionRequestResultDto>>(
    '/correction-requests',
    dto,
  );
  return data.data;
}

export async function getCorrectionRequestForEntry(
  timeEntryId: number,
): Promise<CorrectionRequestResultDto | null> {
  const { data } = await api.get<ApiSuccess<CorrectionRequestResultDto | null>>(
    `/correction-requests?timeEntryId=${timeEntryId}`,
  );
  return data.data;
}

export async function updateCorrectionRequest(
  id: number,
  dto: UpdateCorrectionRequestPayload,
): Promise<CorrectionRequestResultDto> {
  const { data } = await api.patch<ApiSuccess<CorrectionRequestResultDto>>(
    `/correction-requests/${id}`,
    dto,
  );
  return data.data;
}

export async function deleteCorrectionRequest(id: number): Promise<void> {
  await api.delete(`/correction-requests/${id}`);
}
