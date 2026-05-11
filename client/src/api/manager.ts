import { api } from './client.js';

export interface OvertimeRequest {
  id: number;
  userId: number;
  timeEntryId: number;
  status: string;
  overtimeMinutes: number;
  managerNote: string | null;
  createdAt: string;
  clockInAt: string;
  clockOutAt: string | null;
  employeeName: string;
  employeeId: string;
}

export interface FlaggedSession {
  timeEntryId: number;
  employeeName: string;
  employeeId: string;
  clockInAt: string;
  clockOutAt: string | null;
  flagReason: 'AUTO_CLOSED_BREAK';
  correctionCount: number;
}

export async function fetchOvertimeQueue(): Promise<OvertimeRequest[]> {
  const { data } = await api.get<{ success: true; data: OvertimeRequest[] }>('/manager/overtime');
  return data.data;
}

export async function reviewOvertime(
  id: number,
  action: 'APPROVED' | 'REJECTED',
  note: string | null,
): Promise<void> {
  await api.patch(`/manager/overtime/${id}/review`, { action, note });
}

export async function fetchFlaggedSessions(): Promise<FlaggedSession[]> {
  const { data } = await api.get<{ success: true; data: { sessions: FlaggedSession[]; total: number } }>('/manager/flagged');
  return data.data.sessions;
}
