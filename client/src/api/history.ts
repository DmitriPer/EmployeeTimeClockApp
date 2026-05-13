import { api } from './client.js';
import type { HistoryEntryDto, HistoryQueryParams, ApiSuccess } from '@app/shared';

// Legacy aliases — remove once all callers use the Dto names.
export type BreakRecord = import('@app/shared').BreakRecordDto;
export type OvertimeRecord = import('@app/shared').OvertimeRecordDto;
export type PendingCorrectionRecord = import('@app/shared').PendingCorrectionRecordDto;
export type HistoryEntry = HistoryEntryDto;
export type HistoryQuery = HistoryQueryParams;

export async function fetchHistory(query: HistoryQueryParams = {}): Promise<HistoryEntryDto[]> {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.userId) params.set('userId', String(query.userId));
  const { data } = await api.get<ApiSuccess<HistoryEntryDto[]>>(`/history?${params.toString()}`);
  return data.data;
}

export async function updateNote(entryId: number, note: string | null): Promise<void> {
  await api.patch(`/history/entries/${entryId}/note`, { note });
}
