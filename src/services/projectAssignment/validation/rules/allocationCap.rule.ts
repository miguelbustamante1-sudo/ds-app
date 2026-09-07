import { Prisma } from '@prisma/client';
import { prisma } from '../../../../db/prisma';
import type { ValidationResult } from '../types';
import { AssignmentValidationErrors } from '../errors';

/**
 * Validates that adding the new allocation will not push a team member's
 * total concurrent allocation past 100%.
 *
 * Uses COALESCE(end_date, '2050-12-31') so NULL end dates are treated as
 * open-ended, consistent with the agreed query standardization.
 */
export async function validateAllocationCap(
  teamMemberId: number,
  newAllocation: number,
  startDate: Date | string,
  endDate: Date | string | null | undefined,
  excludeAssignmentId?: number,
  excludeProjectId?: number,
): Promise<ValidationResult> {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const endFallback = endDate
    ? (typeof endDate === 'string' ? new Date(endDate) : endDate)
    : new Date('2050-12-31');

  const excludeClause = excludeAssignmentId != null
    ? Prisma.sql`AND tmp_id != ${excludeAssignmentId}`
    : Prisma.empty;

  // When editing, exclude all records for the same project (historical rate-change
  // records are not deleted, just closed with an end_date — they must not be counted).
  const excludeProjectClause = excludeProjectId != null
    ? Prisma.sql`AND pro_id != ${excludeProjectId}`
    : Prisma.empty;

  type Row = { totalAllocation: string };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT COALESCE(SUM(tmp_allocation), 0) AS "totalAllocation"
    FROM ds.tmp_team_member_project
    WHERE tms_id = ${teamMemberId}
      AND tmp_deleted = false
      AND ${start}::date <= COALESCE(tmp_end_date, '2050-12-31'::date)
      AND ${endFallback}::date >= tmp_start_date
      ${excludeClause}
      ${excludeProjectClause}
  `;

  const existingSum = Number(rows[0]?.totalAllocation ?? 0);
  const total = existingSum + newAllocation;

  if (total > 100) {
    return {
      valid: false,
      error: AssignmentValidationErrors.ALLOCATION_EXCEEDS_CAP(total, newAllocation, existingSum),
    };
  }

  return { valid: true };
}
