import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { DateTime } from 'luxon';
import { UserRole } from '@app/shared';
import type { ExportQueryDto } from '@app/shared';
import { getHistory, type HistoryEntry } from '../history/history.service.js';
import { findUserById } from '../users/users.repository.js';

const TZ = 'Asia/Jerusalem';
const COMPANY_NAME = 'Company Name';
const HEADERS = [
  'Date',
  'Clocked In',
  'Clocked Out',
  'Total Work Time',
  'Total Break Time',
  'Net Work Time',
  'Status',
  'Notes',
];

function formatDate(iso: string): string {
  return DateTime.fromISO(iso).setZone(TZ).toFormat('dd/MM/yyyy');
}

function formatTime(iso: string): string {
  return DateTime.fromISO(iso).setZone(TZ).toFormat('HH:mm');
}

function formatMinutes(m: number | null): string {
  if (m === null) return '';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function buildStatus(e: HistoryEntry): string {
  const parts: string[] = [];
  if (e.isFlagged) parts.push('Flagged');
  if (e.overtimeRequest) {
    const s = e.overtimeRequest.status;
    parts.push(`OT ${s.charAt(0) + s.slice(1).toLowerCase()}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Normal';
}

function buildRows(entries: HistoryEntry[]): string[][] {
  return entries.map((e) => [
    formatDate(e.clockInAt),
    formatTime(e.clockInAt),
    e.clockOutAt ? formatTime(e.clockOutAt) : '',
    formatMinutes(e.grossMinutes),
    formatMinutes(e.totalBreakMinutes),
    formatMinutes(e.paidMinutes),
    buildStatus(e),
    e.employeeNote ?? '',
  ]);
}

async function generateCsv(entries: HistoryEntry[]): Promise<Buffer> {
  const csv = stringify([HEADERS, ...buildRows(entries)]);
  const bom = Buffer.from('﻿', 'utf-8');
  return Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);
}

async function generateXls(entries: HistoryEntry[], employeeName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(employeeName);
  const headerRow = ws.addRow(HEADERS);
  headerRow.font = { bold: true };
  buildRows(entries).forEach((row) => ws.addRow(row));
  ws.columns.forEach((col) => { col.width = 14; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function generatePdf(
  entries: HistoryEntry[],
  employeeName: string,
  from: string | undefined,
  to: string | undefined,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const MARGIN = 40;
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const usableW = pageW - MARGIN * 2;
    const footerY = pageH - 28;
    const colWidths = [75, 65, 65, 80, 80, 80, 100, 216];
    const ROW_H = 20;
    const HEADER_BLOCK_H = 56;
    const periodText = from && to ? `${from} — ${to}` : 'All records';

    function drawPageHeader(): number {
      const y = MARGIN;
      doc.rect(MARGIN, y, usableW, HEADER_BLOCK_H).fill('#F3F4F6');
      doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold')
        .text(COMPANY_NAME, MARGIN + 10, y + 9, { lineBreak: false });
      doc.fillColor('#374151').fontSize(8.5).font('Helvetica')
        .text(`Employee: ${employeeName}`, MARGIN + 10, y + 30, { lineBreak: false });
      doc.text(`Period: ${periodText}`, MARGIN + 280, y + 30, { lineBreak: false });
      return y + HEADER_BLOCK_H + 6;
    }

    function drawTableHeader(y: number): number {
      doc.rect(MARGIN, y, usableW, ROW_H).fill('#374151');
      doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
      let x = MARGIN;
      HEADERS.forEach((h, i) => {
        doc.text(h, x + 4, y + 6, { width: colWidths[i] - 4, lineBreak: false });
        x += colWidths[i];
      });
      return y + ROW_H;
    }

    let curY = drawPageHeader();
    curY = drawTableHeader(curY);

    const rows = buildRows(entries);
    doc.font('Helvetica').fontSize(7.5);

    rows.forEach((row, idx) => {
      doc.rect(MARGIN, curY, usableW, ROW_H).fill(idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF');
      doc.fillColor('#111827');
      let x = MARGIN;
      row.forEach((cell, i) => {
        doc.text(cell, x + 4, curY + 6, { width: colWidths[i] - 4, lineBreak: false });
        x += colWidths[i];
      });

      doc.moveTo(MARGIN, curY + ROW_H)
        .lineTo(MARGIN + usableW, curY + ROW_H)
        .strokeColor('#E5E7EB').lineWidth(0.5).stroke();

      curY += ROW_H;
    });

    doc.end();
  });
}

export async function generateExport(
  requesterId: number,
  requesterRole: UserRole,
  dto: ExportQueryDto,
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const targetId =
    requesterRole === UserRole.EMPLOYEE ? requesterId : (dto.employeeId ?? requesterId);

  const entries = await getHistory({
    requesterId,
    requesterRole,
    targetUserId: targetId,
    from: dto.from,
    to: dto.to,
  });

  const user = await findUserById(targetId);
  const employeeName = user?.name ?? 'Employee';
  const safeFilename = employeeName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateRange = dto.from && dto.to ? `${dto.from}_${dto.to}` : 'all';

  switch (dto.format) {
    case 'csv':
      return {
        buffer: await generateCsv(entries),
        contentType: 'text/csv; charset=utf-8',
        filename: `${safeFilename}_${dateRange}.csv`,
      };
    case 'xls':
      return {
        buffer: await generateXls(entries, employeeName),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${safeFilename}_${dateRange}.xlsx`,
      };
    case 'pdf':
      return {
        buffer: await generatePdf(entries, employeeName, dto.from, dto.to),
        contentType: 'application/pdf',
        filename: `${safeFilename}_${dateRange}.pdf`,
      };
  }
}
