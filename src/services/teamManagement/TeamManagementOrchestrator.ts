import type { UpdateMyTeamMemberDTO, MyTeamMemberForManagementDTO } from '@shared/dto';
import { getMyTeamForManagement } from './queries/getMyTeamForManagement';
import { validateIsMyReport } from './components/ValidateIsMyReport';
import { updateTeamMember } from '../teamMember';
import { getActiveProjectAssignmentForTeamMember, updateTeamMemberProject } from '../../db/teamMemberProjects';
import { auditOrchestrator } from '../audit';

export class TeamManagementOrchestrator {
  async getMyTeam(supervisorId: number): Promise<MyTeamMemberForManagementDTO[]> {
    return getMyTeamForManagement(supervisorId);
  }

  /**
   * Free-edit path (no OM approval) — FR-011. Touches TeamMember.knownAs/shift
   * and/or the member's active ProjectAssignment.functionalArea/clientContact.
   */
  async updateFreeEditFields(
    teamMemberId: number,
    supervisorId: number,
    dto: UpdateMyTeamMemberDTO,
    updaterDsUserId: number,
    updaterEmail: string,
  ): Promise<void> {
    await validateIsMyReport(supervisorId, teamMemberId);

    if (dto.teamMemberKnownAs !== undefined || dto.shiftId !== undefined) {
      await updateTeamMember(
        teamMemberId,
        {
          ...(dto.teamMemberKnownAs !== undefined && { teamMemberKnownAs: dto.teamMemberKnownAs }),
          ...(dto.shiftId !== undefined && { shiftId: dto.shiftId }),
        },
        updaterDsUserId,
        updaterEmail,
      );
    }

    if (dto.functionalAreaId !== undefined || dto.clientContactId !== undefined) {
      const activeAssignment = await getActiveProjectAssignmentForTeamMember(teamMemberId);
      if (activeAssignment) {
        const updated = await updateTeamMemberProject(activeAssignment.projectAssignmentId, {
          ...(dto.functionalAreaId !== undefined && { functionalAreaId: dto.functionalAreaId }),
          ...(dto.clientContactId !== undefined && { clientContactId: dto.clientContactId }),
          projectAssignmentLastUpdatedBy: updaterDsUserId,
          projectAssignmentLastUpdatedDate: new Date(),
        });

        await auditOrchestrator.log({
          entityName: 'tmp_team_member_project',
          entityId: String(activeAssignment.projectAssignmentId),
          createdBy: updaterEmail,
          oldValues: activeAssignment as unknown as Record<string, unknown>,
          newValues: updated as unknown as Record<string, unknown>,
          comment: `Functional area / client contact updated by team lead for team member ${teamMemberId}`,
        });
      }
    }
  }
}

export const teamManagementOrchestrator = new TeamManagementOrchestrator();
