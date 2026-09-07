import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { generateCaseCode } from './GenerateCaseCode';
import { spawnPhaseTask } from './SpawnPhaseTask';
import { computePhaseEtaDate } from '../etaTables';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { resolveCaseHierarchySnapshot } from './ResolveCaseHierarchySnapshot';
import { sendCaseNotification } from './SendCaseNotification';
import type { CreatePerformanceCaseDTO, PerformanceCaseDTO } from '@shared/dto';
import { toPerformanceCaseDTO } from '../mappers';

const VALID_TIERS = ['STANDARD', 'HIGH', 'CRITICAL'];
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

export async function createCase(
  input: CreatePerformanceCaseDTO,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCaseDTO> {
  if (!VALID_TIERS.includes(input.severityTier)) {
    throw new AppError(`severityTier must be one of ${VALID_TIERS.join(', ')}`, 400);
  }
  if (!input.managerEmail?.trim()) {
    throw new AppError('managerEmail is required', 400);
  }

  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId: input.teamMemberId },
    select: { teamMemberId: true },
  });
  if (!teamMember) throw new AppError('Team member not found', 404);

  const hierarchySnapshot = await resolveCaseHierarchySnapshot(input.teamLeaderId);

  const created = await createWithCaseCodeRetry((caseCode) =>
    prisma.performanceCase.create({
      data: {
        caseCode,
        caseLabel: input.caseLabel?.trim() ?? null,
        teamMemberId: input.teamMemberId,
        teamLeaderId: input.teamLeaderId,
        omId: hierarchySnapshot.omId,
        agmId: hierarchySnapshot.agmId,
        severityTier: input.severityTier,
        severityTierHistory: [],
        currentPhase: 'PHASE_0',
        caseStatus: 'ACTIVE',
        managerName: input.managerName.trim(),
        managerEmail: input.managerEmail.trim(),
        createdBy: actingUserId,
      },
    }),
  );

  await prisma.performanceCasePhase.create({
    data: {
      caseId: created.caseId,
      phase: 'PHASE_0',
      status: 'IN_PROGRESS',
      startedDate: new Date(),
    },
  });

  const phase0Eta = computePhaseEtaDate('PHASE_0', new Date());
  await spawnPhaseTask(
    created.caseId,
    created.caseCode,
    'PHASE_0',
    input.teamLeaderId,
    phase0Eta,
    actingUserId,
    actingUserEmail,
  );

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(created.caseId),
    createdBy: actingUserEmail,
    oldValues: null,
    newValues: created as unknown as Record<string, unknown>,
  });

  const stakeholders = await resolveCaseStakeholders(created.caseId);
  const recipients = [stakeholders.omId, stakeholders.agmId];
  if (input.severityTier === 'CRITICAL') recipients.push(stakeholders.directorId);
  await sendCaseNotification({
    caseId: created.caseId,
    caseCode: created.caseCode,
    title: `New ${input.severityTier} performance case`,
    message: `A new performance case has been created for review${input.severityTier === 'CRITICAL' ? ' — same-day Director notice required' : ''}.`,
    recipientTeamMemberIds: recipients.filter((id): id is number => id != null),
    stakeholders,
  });

  return toPerformanceCaseDTO(created);
}
