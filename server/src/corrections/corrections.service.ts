import { ErrorCode } from '@app/shared';
import type { CorrectionDto } from '@app/shared';
import { db } from '../db/connection.js';
import { AppError } from '../lib/errors.js';
import * as repo from './corrections.repository.js';

export async function correctTimeEntry(
  timeEntryId: number,
  actorId: number,
  dto: CorrectionDto,
) {
  const entry = await repo.findTimeEntryById(timeEntryId);
  if (!entry) {
    throw new AppError('Time entry not found.', 404, ErrorCode.NOT_FOUND);
  }

  const { field, value } = dto;
  const newDate = new Date(value);

  if (field === 'break_end_at') {
    const breakEvent = await repo.findLastBreakByEntryId(timeEntryId);
    if (!breakEvent) {
      throw new AppError('No break found for this entry.', 404, ErrorCode.NOT_FOUND);
    }

    const oldValue = breakEvent.break_end_at?.toISOString() ?? 'null';

    const auditId = await db.transaction().execute(async (trx) => {
      await repo.updateBreakEndAt(trx, breakEvent.id, newDate);
      return repo.insertAuditLog(trx, {
        timeEntryId,
        actorId,
        targetUserId: entry.user_id,
        fieldName: field,
        oldValue,
        newValue: newDate.toISOString(),
      });
    });

    return { timeEntryId, field, oldValue, newValue: newDate.toISOString(), auditId };
  }

  if (field === 'clock_out_at' && newDate <= entry.clock_in_at) {
    throw new AppError('Clock-out must be after clock-in.', 400, ErrorCode.VALIDATION_ERROR);
  }

  const oldValue =
    field === 'clock_in_at'
      ? entry.clock_in_at.toISOString()
      : (entry.clock_out_at?.toISOString() ?? 'null');

  const auditId = await db.transaction().execute(async (trx) => {
    await repo.updateTimeEntryField(trx, timeEntryId, field, newDate);
    return repo.insertAuditLog(trx, {
      timeEntryId,
      actorId,
      targetUserId: entry.user_id,
      fieldName: field,
      oldValue,
      newValue: newDate.toISOString(),
    });
  });

  return { timeEntryId, field, oldValue, newValue: newDate.toISOString(), auditId };
}

export async function getAuditLog(timeEntryId: number) {
  const entry = await repo.findTimeEntryById(timeEntryId);
  if (!entry) {
    throw new AppError('Time entry not found.', 404, ErrorCode.NOT_FOUND);
  }

  const rows = await repo.findAuditLogByEntryId(timeEntryId);
  return {
    entries: rows.map((r) => ({
      id: r.id,
      actorName: r.actor_name,
      field: r.field_name,
      oldValue: r.old_value,
      newValue: r.new_value,
      createdAt: r.created_at.toISOString(),
    })),
  };
}
