import { prisma } from '../../../db/prisma';
import { toPerformanceCaseCheckInDTO } from '../mappers';
import type { PerformanceCaseCheckInDTO } from '@shared/dto';

export async function listCheckIns(caseId: number): Promise<PerformanceCaseCheckInDTO[]> {
  const rows = await prisma.performanceCaseCheckIn.findMany({
    where: { caseId },
    orderBy: [{ checkInDate: 'desc' }, { checkInId: 'desc' }],
  });
  return rows.map(toPerformanceCaseCheckInDTO);
}
