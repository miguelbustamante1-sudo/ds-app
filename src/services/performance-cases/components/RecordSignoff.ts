import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { toPerformanceCaseDTO } from '../mappers';
import { resolveCaseStakeholders } from './ResolveCaseStakeholders';
import { sendCaseNotification } from './SendCaseNotification';
import { writeWorkdayOutboxEntry } from './WriteWorkdayOutboxEntry';
import type { PerformanceCaseDTO, PostClosureCheckpoint } from '@shared/dto';

export type SignoffGate = 'rca' | 'closure';

export async function recordSignoff(
  caseId: number,
  gate: SignoffGate,
  actingUserId: number,
  actingUserEmail: string,
): Promise<PerformanceCaseDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);

  if (gate === 'rca' && perfCase.currentPhase !== 'PHASE_2') {
    throw new AppError('RCA sign-off can only be recorded during Phase 2', 400);
  }
  if (gate === 'closure' && perfCase.currentPhase !== 'PHASE_6') {
    throw new AppError('Closure sign-off can only be recorded during Phase 6', 400);
  }
  if (gate === 'closure') {
    const criteriaMet = [
      perfCase.clientConfirmedImprovement,
      perfCase.metricImprovedVsBaseline,
      perfCase.noNewEscalationLast2Weeks,
    ].filter(Boolean).length;
    if (criteriaMet < 2) {
      throw new AppError('At least 2 of 3 closure criteria must be confirmed before closure sign-off', 400);
    }
  }

  const now = new Date();
  const updated = await prisma.performanceCase.update({
    where: { caseId },
    data:
      gate === 'rca'
        ? { rcaSignoffBy: actingUserId, rcaSignoffDate: now }
        : { closureSignoffBy: actingUserId, closureSignoffDate: now, caseStatus: 'CLOSED_SUCCESSFUL' },
  });

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(caseId),
    createdBy: actingUserEmail,
    oldValues: null,
    newValues: { gate, signedOffBy: actingUserId } as unknown as Record<string, unknown>,
  });

  if (gate === 'closure') {
    const stakeholders = await resolveCaseStakeholders(caseId);
    const recipients = [stakeholders.omId, stakeholders.agmId];
    if (perfCase.caseStatus === 'CLOSED_ESCALATED') recipients.push(stakeholders.hrPartnerId);
    await sendCaseNotification({
      caseId,
      caseCode: perfCase.caseCode,
      title: 'Performance case closed',
      message: 'The case has been closed following OM sign-off.',
      recipientTeamMemberIds: recipients.filter((id): id is number => id != null),
      stakeholders,
    });

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamMemberId: perfCase.teamMemberId },
      select: { workdayId: true },
    });
    if (teamMember?.workdayId) {
      await writeWorkdayOutboxEntry(caseId, teamMember.workdayId, 'PLAN_CLOSED', {
        closedStatus: 'SUCCESSFUL',
        closingComment: perfCase.clientConfirmedComment ?? null,
        caseFileLink: `/performance-cases/${caseId}`,
      });
    }

    const closedDate = new Date();
    await prisma.performanceCasePostClosureCheckin.createMany({
      data: [15, 30, 60].map((days) => {
        const dueDate = new Date(closedDate);
        dueDate.setDate(dueDate.getDate() + days);
        return { caseId, checkpoint: `DAY_${days}` as PostClosureCheckpoint, dueDate };
      }),
    });
  }

  return toPerformanceCaseDTO(updated);
}
