import { ErrorCode, UserRole } from '@app/shared';
import { AppError } from './errors.js';

export type ReviewableStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReviewAction = 'APPROVED' | 'REJECTED';

export interface ReviewableRequest {
  id: number;
  user_id: number;
  status: ReviewableStatus;
}

export interface ReviewWorkflowArgs<T extends ReviewableRequest, R> {
  /** The fetched request row. */
  request: T | undefined;
  /** Verb for not-found errors, e.g. "Overtime request". */
  resourceName: string;
  /** Reviewer context. */
  reviewerId: number;
  reviewerRole: string;
  action: ReviewAction;
  note: string | null;
  /**
   * Returns true if the reviewer may review this request.
   * Default: ADMIN always allowed; any other role blocked.
   * Provide your own to allow MANAGERs with scope checks.
   */
  canReview?: (req: T) => Promise<boolean>;
  /** Called when action === 'APPROVED'. Performs side-effects and persists status. */
  onApprove: (req: T) => Promise<R>;
  /** Called when action === 'REJECTED'. Persists status + note. */
  onReject: (req: T) => Promise<R>;
}

export async function executeReview<T extends ReviewableRequest, R>(
  args: ReviewWorkflowArgs<T, R>,
): Promise<R> {
  const { request, resourceName, reviewerId, reviewerRole, action, canReview } = args;

  if (!request) {
    throw new AppError(`${resourceName} not found.`, 404, ErrorCode.NOT_FOUND);
  }
  if (request.status !== 'PENDING') {
    throw new AppError(`${resourceName} has already been reviewed.`, 409, ErrorCode.OT_ALREADY_REVIEWED);
  }
  if (request.user_id === reviewerId) {
    throw new AppError('You cannot review your own request.', 403, ErrorCode.CANNOT_SELF_APPROVE);
  }

  const allowed = canReview ? await canReview(request) : reviewerRole === UserRole.ADMIN;
  if (!allowed) {
    throw new AppError(
      `${resourceName} does not belong to one of your employees.`,
      403,
      ErrorCode.FORBIDDEN,
    );
  }

  return action === 'APPROVED' ? args.onApprove(request) : args.onReject(request);
}
