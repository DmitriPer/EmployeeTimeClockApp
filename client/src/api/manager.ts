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

export interface CorrectionRequest {
  id: number;
  timeEntryId: number;
  userId: number;
  employeeName: string;
  employeeId: string;
  requestedClockInAt: string;
  requestedClockOutAt: string | null;
  requestedBreaks: Array<{ start: string; end: string }> | null;
  employeeNote: string;
  currentClockInAt: string;
  currentClockOutAt: string | null;
  createdAt: string;
}

export async function fetchCorrectionQueue(): Promise<CorrectionRequest[]> {
  const { data } = await api.get<{ success: true; data: CorrectionRequest[] }>(
    '/manager/correction-requests',
  );
  return data.data;
}

export async function reviewCorrectionRequest(
  id: number,
  action: 'APPROVED' | 'REJECTED',
  note: string | null,
): Promise<void> {
  await api.patch(`/manager/correction-requests/${id}/review`, { action, note });
}

export interface PendingRetroactiveRequest {
  id: number;
  employeeName: string;
  employeeId: string;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  breaks: Array<{ start: string; end: string }> | null;
  employeeNote: string;
  createdAt: string;
}

export async function fetchRetroactiveQueue(): Promise<PendingRetroactiveRequest[]> {
  const { data } = await api.get<{ success: true; data: PendingRetroactiveRequest[] }>(
    '/manager/retroactive-requests',
  );
  return data.data;
}

export async function reviewRetroactiveRequest(
  id: number,
  action: 'APPROVED' | 'REJECTED',
  note: string | null,
): Promise<void> {
  await api.patch(`/manager/retroactive-requests/${id}/review`, { action, note });
}
