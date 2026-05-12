import { api } from './client.js';

export interface BreakInput {
  start: string;
  end: string;
}

export interface CorrectionRequestResult {
  id: number;
  timeEntryId: number;
  requestedClockIn: string;
  requestedClockOut: string | null;
  breaks: BreakInput[] | null;
  employeeNote: string;
  status: string;
  managerNote: string | null;
  reviewedAt: string | null;
  updatedAt: string;
}

export async function submitCorrectionRequest(dto: {
  timeEntryId: number;
  clockInTime: string;
  clockOutTime?: string;
  breaks?: BreakInput[];
  employeeNote: string;
}): Promise<CorrectionRequestResult> {
  const { data } = await api.post<{ success: true; data: CorrectionRequestResult }>(
    '/correction-requests',
    dto,
  );
  return data.data;
}

export async function getCorrectionRequestForEntry(
  timeEntryId: number,
): Promise<CorrectionRequestResult | null> {
  const { data } = await api.get<{ success: true; data: CorrectionRequestResult | null }>(
    `/correction-requests?timeEntryId=${timeEntryId}`,
  );
  return data.data;
}

export async function updateCorrectionRequest(
  id: number,
  dto: {
    clockInTime?: string;
    clockOutTime?: string;
    breaks?: BreakInput[];
    employeeNote?: string;
  },
): Promise<CorrectionRequestResult> {
  const { data } = await api.patch<{ success: true; data: CorrectionRequestResult }>(
    `/correction-requests/${id}`,
    dto,
  );
  return data.data;
}

export async function deleteCorrectionRequest(id: number): Promise<void> {
  await api.delete(`/correction-requests/${id}`);
}