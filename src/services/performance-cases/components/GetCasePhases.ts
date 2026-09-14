import { prisma } from '../../../db/prisma';
import { PHASE_ORDER } from '../phaseConfig';
import { toPerformanceCasePhaseDTO } from '../mappers';
import type { PerformanceCasePhaseDTO } from '@shared/dto';

export async function getCasePhases(caseId: number): Promise<PerformanceCasePhaseDTO[]> {
  const rows = await prisma.performanceCasePhase.findMany({ where: { caseId } });
  return rows
    .map(toPerformanceCasePhaseDTO)
    .sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase));
}
