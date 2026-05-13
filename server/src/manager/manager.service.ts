/**
 * @file manager.service.ts
 * @description Facade that aggregates per-resource services for the manager routes.
 *              All business logic lives in the per-resource modules.
 */

import * as overtime from '../overtime/overtime.service.js';
import * as flagged from '../flagged/flagged.service.js';
import * as corrections from '../correction-requests/correction-requests.service.js';
import * as retroactive from '../retroactive-requests/retroactive-requests.service.js';

export type { OvertimeRequestRow } from '../overtime/overtime.service.js';
export type { FlaggedSessionRow } from '../flagged/flagged.service.js';
export type { CorrectionRequestRow } from '../correction-requests/correction-requests.service.js';

export const getPendingOvertimeRequests = overtime.listForManager;
export const reviewOvertimeRequest = overtime.review;

export const getFlaggedSessions = flagged.listForManager;
export const reviewFlaggedSession = flagged.review;

export const getCorrectionRequests = corrections.listForManager;
export const reviewCorrectionRequest = corrections.reviewForManager;

export const getRetroactiveRequests = retroactive.getPendingRetroactiveRequests;

export async function reviewRetroactiveRequest(params: {
  requestId: number;
  reviewerId: number;
  reviewerRole: string;
  action: 'APPROVED' | 'REJECTED';
  note: string | null;
}): Promise<ReturnType<typeof retroactive.reviewRetroactiveRequest>> {
  return retroactive.reviewRetroactiveRequest(
    params.reviewerId,
    params.requestId,
    params.reviewerRole,
    params.action,
    params.note,
  );
}
