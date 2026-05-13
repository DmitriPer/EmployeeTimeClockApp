export interface BreakRecordDto {
  id: number;
  breakStartAt: string;
  breakEndAt: string | null;
  durationMinutes: number | null;
}

export interface OvertimeRecordDto {
  id: number;
  status: string;
  overtimeMinutes: number;
}

export interface PendingCorrectionRecordDto {
  id: number;
  status: 'PENDING' | 'REJECTED';
  requestedClockInAt: string;
  requestedClockOutAt: string | null;
  employeeNote: string;
  managerNote: string | null;
}

export interface HistoryEntryDto {
  id: number;
  clockInAt: string;
  clockOutAt: string | null;
  grossMinutes: number | null;
  totalBreakMinutes: number;
  excessBreakMinutes: number;
  paidMinutes: number | null;
  isAutoClosedBreak: boolean;
  isFlagged: boolean;
  isBreakReviewed: boolean;
  isCorrected: boolean;
  isRetroactive: boolean;
  employeeNote: string | null;
  breaks: BreakRecordDto[];
  overtimeRequest: OvertimeRecordDto | null;
  pendingCorrection: PendingCorrectionRecordDto | null;
}

export interface HistoryQueryParams {
  from?: string;
  to?: string;
  userId?: number;
}
