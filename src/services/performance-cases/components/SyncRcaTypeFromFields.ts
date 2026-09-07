import { prisma } from '../../../db/prisma';
import type { PerformanceCasePhaseName, PerformanceRcaType } from '@shared/dto';

const VALID_RCA_TYPES: PerformanceRcaType[] = ['ATTITUDE', 'KNOWLEDGE', 'SKILL', 'RESOURCES', 'COMBINED'];

/**
 * Mirrors a PHASE_2 `rcaType` field value onto the case's dedicated `PerformanceCase.rcaType`
 * column. The phase's fields JSON blob is where PhaseFieldsForm captures it, but
 * CreateCheckIn.ts (and the RCA-driven cadence tables) read the case-level column directly —
 * this keeps the two in sync at every point rcaType could be written. No-op for any other
 * phase or when the value isn't a recognized PerformanceRcaType.
 */
export async function syncRcaTypeFromFields(
  caseId: number,
  currentPhase: PerformanceCasePhaseName,
  fields: Record<string, unknown>,
): Promise<void> {
  if (currentPhase !== 'PHASE_2') return;
  const candidate = fields['rcaType'];
  if (typeof candidate !== 'string' || !VALID_RCA_TYPES.includes(candidate as PerformanceRcaType)) return;
  await prisma.performanceCase.update({ where: { caseId }, data: { rcaType: candidate } });
}
