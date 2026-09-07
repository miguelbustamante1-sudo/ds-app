import { prisma } from '../../../db/prisma';
import { getAllTeamMembers, getTeamMemberByWorkdayId } from '../../../db/teamMembers';
import { standaloneTaskOrchestrator } from '../../standalone-tasks/StandaloneTaskOrchestrator';
import { buildTeamMemberIndex, resolveTeamMemberIdByName } from './ResolveTeamMemberIndex';
import { buildFlagReferenceKey, FLAG_INTAKE_TASK_REFERENCE_TYPE } from './BuildFlagReferenceKey';
import type {
  FlagIntakeRowDTO,
  FlagIntakeRowResultDTO,
  SubmitFlagIntakeResponseDTO,
  TaskPriority,
} from '@shared/dto';

interface SubmitFlagIntakeOptions {
  taskSource?: string;
  apiKeyId?: number;
}

/** First `-`-delimited segment of `concatenate`, validated as a Workday ID (digits only). */
function extractWorkdayId(concatenate: string): string | null {
  const firstDash = concatenate.indexOf('-');
  if (firstDash === -1) return null;
  const candidate = concatenate.slice(0, firstDash).trim();
  return /^\d+$/.test(candidate) ? candidate : null;
}

/** 0 weeks -> LOW, 1-2 -> MEDIUM, 3-4 -> HIGH, 5+ -> CRITICAL. Missing/unparsable tenure defaults to MEDIUM. */
function priorityFromTenure(tenure: string | null | undefined): TaskPriority {
  const match = tenure?.match(/\d+/);
  if (!match) return 'MEDIUM';
  const weeks = parseInt(match[0], 10);
  if (weeks <= 0) return 'LOW';
  if (weeks <= 2) return 'MEDIUM';
  if (weeks <= 4) return 'HIGH';
  return 'CRITICAL';
}

function buildDescription(row: FlagIntakeRowDTO): string {
  const heading = row.category ? `${row.category}\n${row.concatenate}` : row.concatenate;

  const metaParts: string[] = [];
  if (row.tenure) metaParts.push(`Tenure: ${row.tenure}`);
  if (row.om) metaParts.push(`OM: ${row.om}`);
  if (row.latestWaiverStatus) {
    const eta = row.latestWaiverEta ? ` (ETA ${row.latestWaiverEta})` : '';
    metaParts.push(`Waiver: ${row.latestWaiverStatus}${eta}`);
  }

  return metaParts.length > 0 ? `${heading}\n${metaParts.join(' · ')}` : heading;
}

export async function submitFlagIntake(
  rows: FlagIntakeRowDTO[],
  createdBy: number,
  createdByEmail: string,
  options: SubmitFlagIntakeOptions = {},
): Promise<SubmitFlagIntakeResponseDTO> {
  const allMembers = await getAllTeamMembers();
  const teamMemberIndex = buildTeamMemberIndex(allMembers);

  const results: FlagIntakeRowResultDTO[] = [];

  for (const [index, row] of rows.entries()) {
    const fail = (error: string): void => {
      results.push({ index, status: 'failed', error });
    };

    if (!row.report?.trim()) {
      fail('Missing Report');
      continue;
    }
    if (!row.tiSupervisor?.trim()) {
      fail('Missing TI Supervisor');
      continue;
    }

    const workdayId = extractWorkdayId(row.concatenate ?? '');
    if (!workdayId) {
      fail('Could not extract a Workday ID from the Concatenate value');
      continue;
    }

    try {
      const flaggedMember = await getTeamMemberByWorkdayId(workdayId);
      if (!flaggedMember) {
        fail(`Team member not found for Workday ID '${workdayId}'`);
        continue;
      }

      const assigneeId = resolveTeamMemberIdByName(teamMemberIndex, row.tiSupervisor);
      if (assigneeId === null) {
        fail(`Could not uniquely match TI Supervisor '${row.tiSupervisor}' to a team member`);
        continue;
      }

      const referenceId = buildFlagReferenceKey(workdayId, row.report, row.concatenate);

      const existing = await prisma.standaloneTask.findFirst({
        where: {
          taskReferenceType: FLAG_INTAKE_TASK_REFERENCE_TYPE,
          taskReferenceId: referenceId,
          taskStatus: 'PENDING',
        },
        select: { taskId: true },
      });

      if (existing) {
        results.push({ index, status: 'duplicate', taskId: existing.taskId });
        continue;
      }

      const task = await standaloneTaskOrchestrator.createTask(
        {
          taskTitle: row.report.trim(),
          taskDescription: buildDescription(row),
          taskPriority: priorityFromTenure(row.tenure),
          teamMemberId: assigneeId,
          hierarchyContextId: flaggedMember.teamMemberId,
          taskReferenceType: FLAG_INTAKE_TASK_REFERENCE_TYPE,
          taskReferenceId: referenceId,
        },
        createdBy,
        createdByEmail,
        options,
      );

      results.push({ index, status: 'created', taskId: task.taskId });
    } catch (err: unknown) {
      fail(err instanceof Error ? err.message : 'Failed to create flag task');
    }
  }

  return {
    results,
    insertedCount: results.filter((r) => r.status === 'created').length,
    duplicateCount: results.filter((r) => r.status === 'duplicate').length,
    failedCount: results.filter((r) => r.status === 'failed').length,
  };
}
