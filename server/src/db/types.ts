import type { Generated } from 'kysely';

export interface UsersTable {
  id: Generated<number>;
  employee_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
  manager_id: number | null;
  is_active: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface RefreshTokensTable {
  id: Generated<number>;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  created_at: Generated<Date>;
}

export interface TimeEntriesTable {
  id: Generated<number>;
  user_id: number;
  clock_in_at: Date;
  clock_out_at: Date | null;
  is_auto_closed_break: Generated<number>;
  is_flagged: Generated<number>;
  is_retroactive: Generated<number>;
  employee_note: string | null;
  created_at: Generated<Date>;
}

export interface BreakEventsTable {
  id: Generated<number>;
  time_entry_id: number;
  break_start_at: Date;
  break_end_at: Date | null;
}

export interface OvertimeRequestsTable {
  id: Generated<number>;
  time_entry_id: number;
  user_id: number;
  status: Generated<'PENDING' | 'APPROVED' | 'REJECTED'>;
  overtime_minutes: number;
  manager_note: string | null;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  created_at: Generated<Date>;
}

export interface AuditLogTable {
  id: Generated<number>;
  time_entry_id: number;
  actor_id: number;
  target_user_id: number;
  field_name: string;
  old_value: string;
  new_value: string;
  created_at: Generated<Date>;
}

export interface CorrectionRequestsTable {
  id: Generated<number>;
  time_entry_id: number;
  user_id: number;
  requested_clock_in_at: Date;
  requested_clock_out_at: Date | null;
  requested_breaks_json: string | null;
  employee_note: string;
  status: Generated<'PENDING' | 'APPROVED' | 'REJECTED'>;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  manager_note: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface RetroactiveEntryRequestsTable {
  id: Generated<number>;
  user_id: number;
  requested_date: string;
  clock_in_time: string;
  clock_out_time: string;
  breaks_json: string | null;
  employee_note: string;
  status: Generated<'PENDING' | 'APPROVED' | 'REJECTED'>;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  manager_note: string | null;
  created_at: Generated<Date>;
}

export interface Database {
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  time_entries: TimeEntriesTable;
  break_events: BreakEventsTable;
  overtime_requests: OvertimeRequestsTable;
  audit_log: AuditLogTable;
  correction_requests: CorrectionRequestsTable;
  retroactive_entry_requests: RetroactiveEntryRequestsTable;
}
