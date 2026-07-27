import { prisma } from '../../db/prisma';
import { createHiring, executeHiring, getHiringById } from './repository';
import type { CreateHiringInput } from './repository';
import type { CreateHiringDTO, UpdateHiringDTO, HiringDTO } from '@shared/dto';
import type { TeamMember, ProjectAssignment, TimeOff } from '@prisma/client';
import { createTeamMember } from './components/CreateTeamMember';
import { createProjectAssignment } from './components/CreateProjectAssignment';
import { createProjectedVacations } from './components/CreateProjectedVacations';
import { createSupervisorAssignment } from './components/CreateSupervisorAssignment';
import { auditOrchestrator } from '../audit';
import { error } from '../../logger';

type OrchestratorResult<T> =
  | { success: true; data: T }
  | { success: false; errors: { field: string; message: string }[] };

export interface ExecuteHiringResult {
  hiring:             HiringDTO;
  teamMember:         TeamMember;
  projectAssignments: ProjectAssignment[];
  projectedTimeOffs:  TimeOff[];
}

export class HiringOrchestrator {
  async draft(input: CreateHiringDTO, createdBy: string): Promise<OrchestratorResult<unknown>> {
    const data: CreateHiringInput = {
      endorsementId: input.endorsementId,
      startDate: new Date(input.startDate),
      billableDate: new Date(input.billableDate),
      workdayId: input.workdayId ?? null,
      teamLeadId: input.teamLeadId ?? null,
      currencySymbol: input.currencySymbol ?? null,
      createdBy,
    };

    const record = await createHiring(data);
    return { success: true, data: record };
  }

  async execute(
    id: number,
    input: UpdateHiringDTO,
    updatedBy: string,
    dsUserId: number | undefined,
  ): Promise<OrchestratorResult<ExecuteHiringResult>> {
    // --- Guards (all run before any DB write) ---

    const existing = await getHiringById(id);

    if (!existing) {
      return { success: false, errors: [{ field: 'id', message: 'Hiring record not found.' }] };
    }

    if (existing.status !== 'Pending') {
      return { success: false, errors: [{ field: 'status', message: 'Only Pending hirings can be executed.' }] };
    }

    const effectiveWorkdayId = input.workdayId ?? existing.workdayId;
    if (!effectiveWorkdayId) {
      return { success: false, errors: [{ field: 'workdayId', message: 'workdayId is required to execute a hiring.' }] };
    }

    const effectiveTeamLeadId = input.teamLeadId ?? existing.teamLeadId;

    if (dsUserId === undefined) {
      return { success: false, errors: [{ field: 'dsUserId', message: 'Authenticated user not found in team members directory.' }] };
    }

    const endorsement = existing.endorsement;

    // TEMP DEMO: Tier/Band is not enforced here until the Job Profile mapping catalog
    // (TASK-001) is loaded — restore this guard once that data is available.

    if (!endorsement.projectId) {
      return { success: false, errors: [{ field: 'projectId', message: 'Endorsement is missing a project.' }] };
    }

    // --- Resolve effective values ---

    const startDate    = input.startDate    ? new Date(input.startDate)    : existing.startDate;
    const billableDate = input.billableDate ? new Date(input.billableDate) : existing.billableDate;

    // billingRate is Decimal? in schema — default to 0 if missing; Number() handles Decimal safely
    const billRate = endorsement.billingRate != null ? Number(endorsement.billingRate) : 0;

    // currencySymbol: input → existing hiring → country symbol → hardcoded '$'
    const currencySymbol =
      (input.currencySymbol ?? existing.currencySymbol) ??
      endorsement.country.countryCurrencySymbol ??
      '$';

    // --- Atomic transaction ---

    const { teamMember, projectAssignments, projectedTimeOffs, supervisorAssignment, updatedHiring, hiringBefore } =
      await prisma.$transaction(async (tx) => {
        const tm = await createTeamMember(tx, {
          candidateFirstName: endorsement.candidateFirstName,
          candidateLastName:  endorsement.candidateLastName,
          startDate,
          countryId:       endorsement.countryId,
          workdayId:       effectiveWorkdayId,
          seniority:       endorsement.tierBand?.tierBandDescription ?? 'Demo - TBD',
          tierBandId:      endorsement.tibId ?? null,
          primaryRoleId:   endorsement.posId,
          createdByUserId: dsUserId,
        });

        const pas = await createProjectAssignment(tx, {
          teamMemberId:    tm.teamMemberId,
          projectId:       endorsement.projectId,
          startDate,
          billableDate,
          billRate,
          currencySymbol,
          createdByUserId: dsUserId,
        });

        const tofs = await createProjectedVacations(tx, {
          teamMemberId:    tm.teamMemberId,
          countryIso:      endorsement.country.countryIso,
          startDate,
          createdByUserId: dsUserId,
        });

        // Auto-create the supervisor assignment (2026-07-15 demo notes FR-003/FR-004) —
        // effective from the hire start date, same transaction so a failure rolls back the whole hire.
        // Skipped gracefully when no team lead was selected.
        const supAssignment = effectiveTeamLeadId != null
          ? await createSupervisorAssignment(tx, {
              teamMemberId:    tm.teamMemberId,
              supervisorId:    effectiveTeamLeadId,
              startDate,
              createdByUserId: dsUserId,
            })
          : null;

        const before = await tx.hiring.findUnique({ where: { id } });

        const h = await executeHiring(tx, id, {
          ...(input.startDate      !== undefined && { startDate }),
          ...(input.billableDate   !== undefined && { billableDate }),
          ...(input.workdayId      !== undefined && { workdayId: input.workdayId }),
          teamLeadId:     effectiveTeamLeadId,
          ...(input.currencySymbol !== undefined && { currencySymbol: input.currencySymbol }),
          updatedBy,
        });

        return {
          teamMember: tm,
          projectAssignments: pas,
          projectedTimeOffs: tofs,
          supervisorAssignment: supAssignment,
          updatedHiring: h,
          hiringBefore: before,
        };
      });

    // --- Audit logs emitted after the transaction commits ---
    // If any audit write fails the response must still succeed; log the error to console only.
    try {
      await auditOrchestrator.log({
        entityName: 'tbl_team_members',
        entityId:   String(teamMember.teamMemberId),
        createdBy:  updatedBy,
        oldValues:  null,
        newValues:  teamMember as unknown as Record<string, unknown>,
        comment:    `Team member created for candidate ${endorsement.candidateFirstName} ${endorsement.candidateLastName}`,
      });

      for (const pa of projectAssignments) {
        await auditOrchestrator.log({
          entityName: 'tmp_team_member_project',
          entityId:   String(pa.projectAssignmentId),
          createdBy:  updatedBy,
          oldValues:  null,
          newValues:  pa as unknown as Record<string, unknown>,
          comment:    `Project assignment created for team member ${teamMember.teamMemberId} on project ${endorsement.projectId}`,
        });
      }

      for (const tf of projectedTimeOffs) {
        await auditOrchestrator.log({
          entityName: 'tbl_tms_time_off',
          entityId:   String(tf.timeOffId),
          createdBy:  updatedBy,
          oldValues:  null,
          newValues:  tf as unknown as Record<string, unknown>,
          comment:    `Projected vacation created for team member ${teamMember.teamMemberId}`,
        });
      }

      if (supervisorAssignment) {
        await auditOrchestrator.log({
          entityName: 'tbl_tms_x_supervisor',
          entityId:   String(supervisorAssignment.supervisorAssignmentId),
          createdBy:  updatedBy,
          oldValues:  null,
          newValues:  supervisorAssignment as unknown as Record<string, unknown>,
          comment:    `Supervisor assignment created for team member ${teamMember.teamMemberId} (supervisor ${effectiveTeamLeadId})`,
        });
      }

      await auditOrchestrator.log({
        entityName: 'hir_hiring',
        entityId:   String(id),
        createdBy:  updatedBy,
        oldValues:  hiringBefore as unknown as Record<string, unknown>,
        newValues:  updatedHiring as unknown as Record<string, unknown>,
        comment:    'Hiring executed — status set to Processed',
      });
    } catch (auditErr) {
      error('Audit log failed after hiring execution:', auditErr);
    }

    return {
      success: true,
      data: {
        hiring:             updatedHiring as unknown as HiringDTO,
        teamMember,
        projectAssignments,
        projectedTimeOffs,
      },
    };
  }
}

export const hiringOrchestrator = new HiringOrchestrator();
