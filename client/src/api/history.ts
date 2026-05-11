import { api } from './client.js';

export interface BreakRecord {
  id: number;
  breakStartAt: string;
  breakEndAt: string | null;
  durationMinutes: number | null;
}

export interface OvertimeRecord {
  id: number;
  status: string;
  overtimeMinutes: number;
}

export interface HistoryEntry {
  id: number;
  clockInAt: string;
  clockOutAt: string | null;
  grossMinutes: number | null;
  totalBreakMinutes: number;
  excessBreakMinutes: number;
  paidMinutes: number | null;
  isAutoClosedBreak: boolean;
  isFlagged: boolean;
  employeeNote: string | null;
  breaks: BreakRecord[];
  overtimeRequest: OvertimeRecord | null;
}

export interface HistoryQuery {
  from?: string;
  to?: string;
  userId?: number;
}

export async function fetchHistory(query: HistoryQuery = {}): Promise<HistoryEntry[]> {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.userId) params.set('userId', String(query.userId));

  const { data } = await api.get<{ success: true; data: HistoryEntry[] }>(
    `/history?${params.toString()}`,
  );
  return data.data;
}

export async function updateNote(entryId: number, note: string | null): Promise<void> {
  await api.patch(`/history/entries/${entryId}/note`, { note });
}
