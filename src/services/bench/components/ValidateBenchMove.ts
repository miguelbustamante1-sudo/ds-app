/**
 * Validates that a bench move is permissible before any DB mutations occur.
 *
 * Checks (in order):
 * 1. The teamMemberId is a direct report of the requesting supervisor.
 * 2. The TM does not already have an active Bench record (endDate IS NULL).
 */

import { prisma } from '../../../db/prisma';
import { getReports } from '../../teamMember';

export class BenchMoveValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'BenchMoveValidationError';
    this.statusCode = statusCode;
  }
}

/**
 * @param teamMemberId - The TM to be moved to bench
 * @param supervisorId - req.user.teamMemberId from the route (the requesting supervisor)
 * @throws BenchMoveValidationError with an appropriate statusCode
 */
export async function validateBenchMove(
  teamMemberId: number,
  supervisorId: number,
): Promise<void> {
  // 1. Confirm TM is a direct report of the requesting supervisor
  const directReports = await getReports(supervisorId, false);
  const isDirectReport = directReports.some((r) => r.teamMemberId === teamMemberId);
  if (!isDirectReport) {
    throw new BenchMoveValidationError(
      'Team member is not a direct report of the requesting supervisor',
      403,
    );
  }

  // 2. TM must not already have an active bench record
  const activeBench = await prisma.bench.findFirst({
    where: {
      teamMemberId,
      endDate: null,
    },
  });
  if (activeBench) {
    throw new BenchMoveValidationError(
      'Team member already has an active bench record',
      400,
    );
  }
}
