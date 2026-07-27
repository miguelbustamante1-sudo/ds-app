import type { ProjectGrantDTO, CreateProjectGrantDTO } from '@shared/dto';
import {
  getProjectManagerId,
  getGrant,
  getGrantsForProject,
  getGrantById,
  createGrant,
  deleteGrant,
  TABLE,
  type ProjectGrantWithDetails,
} from './repository';
import { auditOrchestrator } from '../audit';
import { AppError } from '../../errors/AppError';

function toDTO(row: ProjectGrantWithDetails): ProjectGrantDTO {
  return {
    projectGrantId: row.projectGrantId,
    projectId: row.projectId,
    teamMemberId: row.teamMemberId,
    teamMemberName: `${row.teamMember.teamMemberNames} ${row.teamMember.teamMemberSurnames}`,
    access: row.access as ProjectGrantDTO['access'],
    createdAt: row.createdAt,
  };
}

export class ProjectAccessOrchestrator {
  /** A project is modifiable by its PM or anyone holding an 'owner' grant (FR-012). Reads are never restricted. */
  async canModifyProject(teamMemberId: number | undefined, projectId: number): Promise<boolean> {
    if (teamMemberId == null) return false;
    const pmId = await getProjectManagerId(projectId);
    if (pmId === teamMemberId) return true;
    const grant = await getGrant(projectId, teamMemberId);
    return grant?.access === 'owner';
  }

  async getGrants(projectId: number): Promise<ProjectGrantDTO[]> {
    const rows = await getGrantsForProject(projectId);
    return rows.map(toDTO);
  }

  async createGrant(
    dto: CreateProjectGrantDTO,
    createdByDsUserId: number,
    createdByEmail: string,
  ): Promise<ProjectGrantDTO> {
    const existing = await getGrant(dto.projectId, dto.teamMemberId);
    if (existing) throw new AppError('This team member already has a grant for this project', 400);

    const created = await createGrant({
      projectId: dto.projectId,
      teamMemberId: dto.teamMemberId,
      access: dto.access,
      createdBy: createdByDsUserId,
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.projectGrantId),
      createdBy: createdByEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Project ${dto.projectId} granted "${dto.access}" access to team member ${dto.teamMemberId}`,
    });

    return toDTO(created);
  }

  async deleteGrant(id: number, deletedByEmail: string): Promise<void> {
    const existing = await getGrantById(id);
    if (!existing) throw new AppError('Grant not found', 404);

    await deleteGrant(id);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: deletedByEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: null,
      comment: 'Project grant removed',
    });
  }
}

export const projectAccessOrchestrator = new ProjectAccessOrchestrator();
