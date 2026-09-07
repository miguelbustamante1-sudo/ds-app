import { prisma } from '../../../db/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { toPerformanceCaseDTO } from '../mappers';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { sendCaseNotification } from './SendCaseNotification';
import type { PerformanceCaseDTO, PerformanceSeverityTier, SeverityTierHistoryEntry } from '@shared/dto';

const TIER_RANK: Record<PerformanceSeverityTier, number> = { STANDARD: 0, HIGH: 1, CRITICAL: 2 };

export async function upgradeSeverity(
  caseId: number,
  to: PerformanceSeverityTier,
  reason: string,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCaseDTO> {
  if (!reason?.trim()) throw new AppError('A reason is required to upgrade severity tier', 400);

  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);

  const from = perfCase.severityTier as PerformanceSeverityTier;
  if (TIER_RANK[to] <= TIER_RANK[from]) {
    throw new AppError(`Severity tier can only be upgraded — cannot move from ${from} to ${to}`, 400);
  }

  const history = perfCase.severityTierHistory as unknown as SeverityTierHistoryEntry[];
  const entry: SeverityTierHistoryEntry = {
    from,
    to,
    reason: reason.trim(),
    changedBy: actingUserId,
    changedDate: new Date().toISOString(),
  };

  const updated = await prisma.performanceCase.update({
    where: { caseId },
    data: {
      severityTier: to,
      severityTierHistory: [...history, entry] as unknown as Prisma.InputJsonValue,
      updatedBy: actingUserId,
      updatedDate: new Date(),
    },
  });

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(caseId),
    createdBy: actingUserEmail,
    oldValues: { severityTier: from } as unknown as Record<string, unknown>,
    newValues: { severityTier: to } as unknown as Record<string, unknown>,
    comment: reason.trim(),
  });

  const stakeholders = await resolveCaseStakeholders(caseId);
  const recipients = [stakeholders.omId, stakeholders.agmId];
  if (to === 'CRITICAL') recipients.push(stakeholders.directorId);
  await sendCaseNotification({
    caseId,
    caseCode: perfCase.caseCode,
    title: `Performance case severity upgraded to ${to}`,
    message: `Reason: ${reason.trim()}`,
    recipientTeamMemberIds: recipients.filter((id): id is number => id != null),
    stakeholders,
  });

  return toPerformanceCaseDTO(updated);
}
