import { standaloneTaskOrchestrator } from '../../standalone-tasks/StandaloneTaskOrchestrator';
import type { CreateStandaloneTaskDTO, PerformanceCasePhaseName, StandaloneTaskDTO } from '@shared/dto';

const PHASE_TASK_TITLES: Record<PerformanceCasePhaseName, string> = {
  PHASE_0: 'Complete intake for performance case',
  PHASE_1: 'Hold feedback meeting for performance case',
  PHASE_2: 'Complete RCA for performance case',
  PHASE_3: 'Finalize action plan + manager commitment for performance case',
  PHASE_4: 'Hold TM plan meeting for performance case',
  PHASE_5: 'Log check-in for performance case',
  PHASE_6: 'Complete closure review for performance case',
  POST_CLOSURE: 'Complete post-closure check-in for performance case',
};

/**
 * Creates the StandaloneTask for a phase transition by delegating to
 * standaloneTaskOrchestrator.createTask — this is the only entry point into the
 * standalone-tasks domain (governance 3.6-style cross-domain wrapper pattern), and it
 * resolves `createdBy`/audit logging internally, so this component must never write to
 * `prisma.standaloneTask` directly.
 */
export async function spawnPhaseTask(
  caseId: number,
  caseCode: string,
  phase: PerformanceCasePhaseName,
  teamLeaderId: number,
  dueDate: Date | null,
  actingUserId: number,
  actingUserEmail: string,
): Promise<StandaloneTaskDTO> {
  const input: CreateStandaloneTaskDTO = {
    taskTitle: `${PHASE_TASK_TITLES[phase]} (${caseCode})`,
    taskDueDate: dueDate ? dueDate.toISOString() : null,
    teamMemberId: teamLeaderId,
    taskReferenceType: 'PerformanceCase',
    taskReferenceId: String(caseId),
  };

  return standaloneTaskOrchestrator.createTask(input, actingUserId, actingUserEmail, {
    taskSource: 'INTERNAL',
  });
}
