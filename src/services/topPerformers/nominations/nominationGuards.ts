import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { getReportsForTopPerformers } from '../../teamMember/queries/getReportsForTopPerformers';
import type { TpCycleStatus } from '@shared/dto/TopPerformersCycle';

export function assertNotSelfNomination(nominatorId: number, nomineeId: number): void {
  if (nominatorId === nomineeId) {
    throw new AppError('You cannot nominate yourself', 400);
  }
}

export async function assertNoDuplicateNomination(
  cycId: number,
  nomNominatorId: number,
  nomNomineeId: number
): Promise<void> {
  const existing = await prisma.tpNomination.findFirst({
    where: {
      cycId,
      nomNominatorId,
      nomNomineeId,
      nomStatus: { not: 'DRAFT' },
    },
    select: { nomId: true },
  });
  if (existing) {
    throw new AppError('You have already submitted a nomination for this person in this cycle', 409);
  }
}

export async function assertNominationsOpen(cycId: number): Promise<void> {
  const cycle = await prisma.tpCycle.findUnique({ where: { cycId }, select: { cycStatus: true } });
  if (!cycle) throw new AppError('Cycle not found', 404);
  const status = cycle.cycStatus as TpCycleStatus;
  if (status !== 'NOMINATIONS_OPEN') {
    throw new AppError('Nominations are not currently open for this cycle', 400);
  }
}

export async function assertAdminCanNominate(
  adminTeamMemberId: number,
  nomineeId: number
): Promise<void> {
  const reports = await getReportsForTopPerformers(adminTeamMemberId);
  const reportIds = reports.map((r) => r.teamMemberId);
  if (!reportIds.includes(nomineeId)) {
    throw new AppError('You can only nominate collaborators within your organization', 403);
  }
}
