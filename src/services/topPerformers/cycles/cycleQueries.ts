import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { TpCycleDTO } from '@shared/dto/TopPerformersCycle';

export { TpCycleDTO };

export const cycleSelect = {
  cycId: true,
  cycName: true,
  cycNominationsStart: true,
  cycNominationsEnd: true,
  cycVotingStart: true,
  cycVotingEnd: true,
  cycStatus: true,
  cycCreatedDate: true,
} as const;

type CycleRow = Prisma.TpCycleGetPayload<{ select: typeof cycleSelect }>;

export function toDTO(row: CycleRow): TpCycleDTO {
  return {
    cycId: row.cycId,
    cycName: row.cycName,
    cycNominationsStart: row.cycNominationsStart.toISOString(),
    cycNominationsEnd: row.cycNominationsEnd.toISOString(),
    cycVotingStart: row.cycVotingStart.toISOString(),
    cycVotingEnd: row.cycVotingEnd.toISOString(),
    cycStatus: row.cycStatus,
    cycCreatedDate: row.cycCreatedDate.toISOString(),
  };
}

export async function getAllCycles(): Promise<TpCycleDTO[]> {
  const rows = await prisma.tpCycle.findMany({ select: cycleSelect, orderBy: { cycCreatedDate: 'desc' } });
  return rows.map(toDTO);
}

export async function getCycleById(cycId: number): Promise<TpCycleDTO> {
  const row = await prisma.tpCycle.findUnique({ where: { cycId }, select: cycleSelect });
  if (!row) throw new AppError('Cycle not found', 404);
  return toDTO(row);
}

export async function getActiveCycle(): Promise<TpCycleDTO | null> {
  const row = await prisma.tpCycle.findFirst({
    where: { cycStatus: { in: ['NOMINATIONS_OPEN', 'NOMINATIONS_CLOSED', 'VOTING_OPEN'] } },
    select: cycleSelect,
    orderBy: { cycNominationsStart: 'desc' },
  });
  return row ? toDTO(row) : null;
}
