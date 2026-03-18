import { prisma } from '../../db/prisma';
import { createHiring, getHiringById } from './repository';
import type { CreateHiringInput } from './repository';
import type { CreateHiringDTO, UpdateHiringDTO, HiringDTO } from '@shared/dto';
import type { TeamMember, ProjectAssignment, TimeOff } from '@prisma/client';
import { createTeamMember } from './components/CreateTeamMember';
import { createProjectAssignment } from './components/CreateProjectAssignment';
import { createProjectedVacations } from './components/CreateProjectedVacations';
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

    if (dsUserId === undefined) {
      return { success: false, errors: [{ field: 'dsUserId', message: 'Authenticated user not found in team members directory.' }] };
    }

    const endorsement = existing.endorsement;

    if (!endorsement.tierBand) {
      return { success: false, errors: [{ field: 'tierBand', message: 'Endorsement is missing a tier band.' }] };
    }

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

    const { teamMember, projectAssignments, projectedTimeOffs, updatedHiring, hiringBefore } =
      await prisma.$transaction(async (tx) => {
        const tm = await createTeamMember(tx, {
          candidateFirstName: endorsement.candidateFirstName,
          candidateLastName:  endorsement.candidateLastName,
          startDate,
          countryId:       endorsement.countryId,
          workdayId:       effectiveWorkdayId,
          seniority:       endorsement.tierBand!.tierBandDescription,
          tierBandId:      endorsement.tibId!,
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

        const before = await tx.hiring.findUnique({ where: { id } });

        const h = await tx.hiring.update({
          where: { id },
          data: {
            ...(input.startDate      !== undefined && { startDate }),
            ...(input.billableDate   !== undefined && { billableDate }),
            ...(input.workdayId      !== undefined && { workdayId: input.workdayId }),
            ...(input.currencySymbol !== undefined && { currencySymbol: input.currencySymbol }),
            status:    'Processed',
            updatedBy,
            updatedAt: new Date(),
          },
          include: {
            endorsement: { include: { project: true, country: true, tierBand: true } },
          },
        });

        return { teamMember: tm, projectAssignments: pas, projectedTimeOffs: tofs, updatedHiring: h, hiringBefore: before };
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
