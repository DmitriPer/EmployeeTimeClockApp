export type ExportFormat = 'csv' | 'xls' | 'pdf';

export interface ExportQueryParams {
  from?: string;
  to?: string;
  format: ExportFormat;
  employeeId?: number;
}
