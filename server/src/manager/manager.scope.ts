import { UserRole } from '@app/shared';

/**
 * Returns the managerId filter for repo queries.
 * MANAGER → filter to their employees; ADMIN → no filter (sees all).
 */
export function asRepoManagerFilter(
  requesterId: number,
  requesterRole: string,
): number | undefined {
  return requesterRole === UserRole.MANAGER ? requesterId : undefined;
}
