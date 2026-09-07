import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { generateCaseCode } from './GenerateCaseCode';
import { toPerformanceCaseDTO } from '../mappers';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { sendCaseNotification } from './SendCaseNotification';
import type { PerformanceCaseDTO, PerformanceSeverityTier } from '@shared/dto';

const MAX_CASE_CODE_ATTEMPTS = 3;

/**
 * Retries case creation on a caseCode collision (DB-level unique constraint uk_pmc_case_code).
 * generateCaseCode counts existing rows to pick the next sequence number, so a concurrent
 * create between the count and the insert can produce a duplicate code — retry with a
 * freshly generated code rather than letting the P2002 bubble up as an unhandled 500.
 */
async function createWithCaseCodeRetry<T>(
  buildAndCreate: (caseCode: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_CASE_CODE_ATTEMPTS; attempt++) {
    const caseCode = await generateCaseCode(new Date());
    try {
      return await buildAndCreate(caseCode);
    } catch (err) {
      const isCaseCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        (err.meta?.target as string[] | undefined)?.includes('pmc_case_code');
      if (!isCaseCodeCollision || attempt === MAX_CASE_CODE_ATTEMPTS) throw err;
      // retry with a freshly generated code
    }
  }
  throw new AppError('Failed to generate a unique case code after multiple attempts', 500);
}

export async function spawnRegressionCase(
  priorCaseId: number,
  newSeverityTier: PerformanceSeverityTier,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCaseDTO> {
  const priorCase = await prisma.performanceCase.findUnique({ where: { caseId: priorCaseId } });
  if (!priorCase) throw new AppError('Prior case not found', 404);

  const created = await createWithCaseCodeRetry((caseCode) =>
    prisma.performanceCase.create({
      data: {
        caseCode,
        teamMemberId: priorCase.teamMemberId,
        teamLeaderId: priorCase.teamLeaderId,
        severityTier: newSeverityTier,
        severityTierHistory: [],
        currentPhase: 'PHASE_1',
        caseStatus: 'ACTIVE',
        omId: priorCase.omId,
        agmId: priorCase.agmId,
        directorId: priorCase.directorId,
        hrPartnerId: priorCase.hrPartnerId,
        managerName: priorCase.managerName,
        managerEmail: priorCase.managerEmail,
        linkedPriorCaseId: priorCaseId,
        createdBy: actingUserId,
      },
    }),
  );

  await prisma.performanceCasePhase.create({
    data: { caseId: created.caseId, phase: 'PHASE_1', status: 'IN_PROGRESS', startedDate: new Date() },
  });

  await prisma.performanceCase.update({
    where: { caseId: priorCaseId },
    data: { caseStatus: 'REGRESSED', updatedBy: actingUserId, updatedDate: new Date() },
  });

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(created.caseId),
    createdBy: actingUserEmail,
    oldValues: null,
    newValues: created as unknown as Record<string, unknown>,
    comment: `Regression restart of case ${priorCase.caseCode}`,
  });

  const stakeholders = await resolveCaseStakeholders(created.caseId);
  await sendCaseNotification({
    caseId: created.caseId,
    caseCode: created.caseCode,
    title: 'Regression detected — new case opened',
    message: `Restarted from prior case ${priorCase.caseCode} at Phase 1.`,
    recipientTeamMemberIds: [stakeholders.omId, stakeholders.agmId].filter((id): id is number => id != null),
    stakeholders,
  });

  return toPerformanceCaseDTO(created);
}
