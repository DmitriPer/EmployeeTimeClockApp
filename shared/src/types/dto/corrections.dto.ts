export interface BreakInputDto {
  start: string;
  end: string;
}

export interface CorrectionRequestResultDto {
  id: number;
  timeEntryId: number;
  requestedClockIn: string;
  requestedClockOut: string | null;
  breaks: BreakInputDto[] | null;
  employeeNote: string;
  status: string;
  managerNote: string | null;
  reviewedAt: string | null;
  updatedAt: string;
}

export interface SubmitCorrectionRequestPayload {
  timeEntryId: number;
  clockInTime: string;
  clockOutTime?: string;
  breaks?: BreakInputDto[];
  employeeNote: string;
}

export interface UpdateCorrectionRequestPayload {
  clockInTime?: string;
  clockOutTime?: string;
  breaks?: BreakInputDto[];
  employeeNote?: string;
}
