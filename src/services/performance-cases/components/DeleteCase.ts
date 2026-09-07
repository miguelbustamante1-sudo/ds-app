import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { standaloneTaskOrchestrator } from '../../standalone-tasks/StandaloneTaskOrchestrator';

/**
 * Removes a performance case that never left Phase 0 — i.e. it's still sitting in creation
 * with no phase advancement, sign-offs, check-ins, or closure activity. There's no soft-delete
 * column on pmc_performance_cases, and nothing genuinely happened yet for a Phase 0 case, so a
 * real delete (not a status flag) is appropriate here.
 */
export async function deleteCase(
  caseId: number,
  actingUserId: number,
  actingUserEmail: string,
  actingTeamMemberId: number,
): Promise<void> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId } });
  if (!perfCase) throw new AppError('Case not found', 404);
  if (perfCase.caseStatus !== 'ACTIVE' || perfCase.currentPhase !== 'PHASE_0') {
    throw new AppError('Only a case still in Phase 0 (creation) can be deleted', 400);
  }

  // Resolve the intake task spawned on case creation before deleting the case — if this
  // unexpectedly fails, the case row is left intact rather than being deleted with an
  // orphaned task left behind. taskReferenceType/taskReferenceId is a loose (non-FK) pointer,
  // so it won't already block the delete itself.
  const spawnedTask = await prisma.standaloneTask.findFirst({
    where: { taskReferenceType: 'PerformanceCase', taskReferenceId: String(caseId), taskStatus: 'PENDING' },
  });
  if (spawnedTask) {
    await standaloneTaskOrchestrator.resolveTask(
      spawnedTask.taskId,
      { status: 'REJECTED', comment: `Performance case ${perfCase.caseCode} was removed before phase advancement.` },
      actingUserId,
      actingUserEmail,
      actingTeamMemberId,
    );
  }

  // pmc_case_phases and pfc_case_documents FK-reference the case with no ON DELETE CASCADE,
  // so they must be cleared first. Neither checkIns nor postClosureCheckins can exist yet for
  // a case still at Phase 0, so there's nothing to clean up there.
  await prisma.$transaction([
    prisma.performanceCaseDocument.deleteMany({ where: { caseId } }),
    prisma.performanceCasePhase.deleteMany({ where: { caseId } }),
    prisma.performanceCase.delete({ where: { caseId } }),
  ]);

  await auditOrchestrator.log({
    entityName: 'pmc_performance_cases',
    entityId: String(caseId),
    createdBy: actingUserEmail,
    oldValues: perfCase as unknown as Record<string, unknown>,
    newValues: null,
    comment: `Performance case ${perfCase.caseCode} removed while still in creation (Phase 0)`,
  });
}
