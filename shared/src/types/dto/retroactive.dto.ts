import type { BreakInputDto } from './corrections.dto.js';

export interface RetroactiveRequestResultDto {
  id: number;
  date: string;
  clockInTime: string;
  clockOutTime: string;
  breaks: BreakInputDto[] | null;
  employeeNote: string;
  status: string;
  managerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface SubmitRetroactiveRequestPayload {
  date: string;
  clockInTime: string;
  clockOutTime: string;
  breaks?: BreakInputDto[];
  employeeNote: string;
}
