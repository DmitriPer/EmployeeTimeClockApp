import { api } from './client.js';
import type { BreakInput } from './correctionRequests.js';

export interface RetroactiveRequestResult {
  id: number;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  breaks: BreakInput[] | null;
  employeeNote: string;
  status: string;
  managerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export async function submitRetroactiveRequest(dto: {
  date: string;
  clockInTime: string;
  clockOutTime: string;
  breaks?: BreakInput[];
  employeeNote: string;
}): Promise<RetroactiveRequestResult> {
  const { data } = await api.post<{ success: true; data: RetroactiveRequestResult }>(
    '/retroactive-requests',
    dto,
  );
  return data.data;
}

export async function getMyRetroactiveRequests(): Promise<RetroactiveRequestResult[]> {
  const { data } = await api.get<{ success: true; data: RetroactiveRequestResult[] }>(
    '/retroactive-requests',
  );
  return data.data;
}

export async function cancelRetroactiveRequest(id: number): Promise<void> {
  await api.delete(`/retroactive-requests/${id}`);
}
