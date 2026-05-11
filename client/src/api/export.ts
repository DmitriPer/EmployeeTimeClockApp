import { api } from './client.js';

export type ExportFormat = 'csv' | 'xls' | 'pdf';

export async function downloadExport(params: {
  from?: string;
  to?: string;
  format: ExportFormat;
  employeeId?: number;
}): Promise<void> {
  const query = new URLSearchParams({ format: params.format });
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.employeeId !== undefined) query.set('employeeId', String(params.employeeId));

  const response = await api.get(`/export?${query}`, { responseType: 'blob' });

  const disposition = response.headers['content-disposition'] ?? '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match?.[1] ?? `export.${params.format}`;

  const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
