export type ReviewAction = 'APPROVED' | 'REJECTED';

export interface OvertimeRequestDto {
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

export interface FlaggedSessionDto {
  timeEntryId: number;
  employeeName: string;
  employeeId: string;
  clockInAt: string;
  clockOutAt: string | null;
  flagReason: 'AUTO_CLOSED_BREAK';
  correctionCount: number;
  breakStartAt: string | null;
  breakEndAt: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

export interface ManagerCorrectionRequestDto {
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

export interface ManagerRetroactiveRequestDto {
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
