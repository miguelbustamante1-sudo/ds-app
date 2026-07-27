import type { Prisma } from '@prisma/client';
import type {
  CreateTeamMemberChangeRequestDTO,
  CreateAttritionRequestDTO,
  TeamMemberChangeRequestDTO,
  TeamMemberChangeRequestType,
  TeamMemberChangeRequestStatus,
} from '@shared/dto';
import {
  createChangeRequest,
  getChangeRequestById,
  getPendingChangeRequests,
  updateChangeRequestStatus,
  TABLE,
  type ChangeRequestWithDetails,
} from './repository';
import { applyChangeRequest } from './components/ApplyChangeRequest';
import {
  TeamMemberNotFoundError,
  ChangeRequestNotFoundError,
  ChangeRequestNotPendingError,
  NoRequestedChangesError,
} from './errors';
import { getTeamMemberById } from '../../db/teamMembers';
import { auditOrchestrator } from '../audit';

type Diff = Record<string, { old: unknown; new: unknown }>;

function toDTO(row: ChangeRequestWithDetails): TeamMemberChangeRequestDTO {
  return {
    changeRequestId: row.changeRequestId,
    teamMemberId: row.teamMemberId,
    teamMemberNames: row.teamMember.teamMemberNames,
    teamMemberSurnames: row.teamMember.teamMemberSurnames,
    type: row.type as TeamMemberChangeRequestType,
    status: row.status as TeamMemberChangeRequestStatus,
    changes: row.changes as Diff,
    requestedBy: row.requestedBy,
    requestedByName: row.requestedByUser?.userName ?? null,
    requestedAt: row.requestedAt,
    reviewedBy: row.reviewedBy,
    reviewedByName: row.reviewedByUser?.userName ?? null,
    reviewedAt: row.reviewedAt,
    reviewComment: row.reviewComment,
  };
}

export class TeamMemberChangeRequestOrchestrator {
  async createEditRequest(
    teamMemberId: number,
    dto: CreateTeamMemberChangeRequestDTO,
    requestedByDsUserId: number,
    requestedByEmail: string,
  ): Promise<TeamMemberChangeRequestDTO> {
    const existing = await getTeamMemberById(teamMemberId);
    if (!existing) throw new TeamMemberNotFoundError();

    const changes: Diff = {};
    if (dto.tierBandId !== undefined && dto.tierBandId !== existing.tierBandId) {
      changes.tierBandId = { old: existing.tierBandId, new: dto.tierBandId };
    }
    if (dto.teamMemberPrimaryRole !== undefined && dto.teamMemberPrimaryRole !== existing.teamMemberPrimaryRole) {
      changes.teamMemberPrimaryRole = { old: existing.teamMemberPrimaryRole, new: dto.teamMemberPrimaryRole };
    }
    if (
      dto.teamMemberFullLegalName !== undefined &&
      dto.teamMemberFullLegalName !== existing.teamMemberFullLegalName
    ) {
      changes.teamMemberFullLegalName = { old: existing.teamMemberFullLegalName, new: dto.teamMemberFullLegalName };
    }

    if (Object.keys(changes).length === 0) throw new NoRequestedChangesError();

    const created = await createChangeRequest({
      teamMemberId,
      type: 'edit',
      status: 'Pending',
      changes: changes as Prisma.InputJsonValue,
      requestedBy: requestedByDsUserId,
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.changeRequestId),
      createdBy: requestedByEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Change request submitted for team member ${teamMemberId}`,
    });

    return toDTO(created);
  }

  async createAttritionRequest(
    teamMemberId: number,
    dto: CreateAttritionRequestDTO,
    requestedByDsUserId: number,
    requestedByEmail: string,
  ): Promise<TeamMemberChangeRequestDTO> {
    const existing = await getTeamMemberById(teamMemberId);
    if (!existing) throw new TeamMemberNotFoundError();

    const changes: Diff = {
      teamMemberEndDate: { old: existing.teamMemberEndDate, new: dto.teamMemberEndDate },
    };

    const created = await createChangeRequest({
      teamMemberId,
      type: 'attrition',
      status: 'Pending',
      changes: changes as Prisma.InputJsonValue,
      requestedBy: requestedByDsUserId,
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.changeRequestId),
      createdBy: requestedByEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Attrition requested for team member ${teamMemberId} — last day ${dto.teamMemberEndDate}`,
    });

    return toDTO(created);
  }

  async getPending(): Promise<TeamMemberChangeRequestDTO[]> {
    const rows = await getPendingChangeRequests();
    return rows.map(toDTO);
  }

  async approve(
    id: number,
    reviewerDsUserId: number,
    reviewerEmail: string,
    comment: string | null,
  ): Promise<TeamMemberChangeRequestDTO> {
    const existing = await getChangeRequestById(id);
    if (!existing) throw new ChangeRequestNotFoundError();
    if (existing.status !== 'Pending') throw new ChangeRequestNotPendingError();

    await applyChangeRequest(existing.teamMemberId, existing.changes as Diff, reviewerDsUserId, reviewerEmail);

    const updated = await updateChangeRequestStatus(id, {
      status: 'Approved',
      reviewedBy: reviewerDsUserId,
      reviewComment: comment,
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: reviewerEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Change request approved',
    });

    return toDTO((await getChangeRequestById(id))!);
  }

  async reject(
    id: number,
    reviewerDsUserId: number,
    reviewerEmail: string,
    comment: string | null,
  ): Promise<TeamMemberChangeRequestDTO> {
    const existing = await getChangeRequestById(id);
    if (!existing) throw new ChangeRequestNotFoundError();
    if (existing.status !== 'Pending') throw new ChangeRequestNotPendingError();

    const updated = await updateChangeRequestStatus(id, {
      status: 'Rejected',
      reviewedBy: reviewerDsUserId,
      reviewComment: comment,
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: reviewerEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Change request rejected',
    });

    return toDTO((await getChangeRequestById(id))!);
  }
}

export const teamMemberChangeRequestOrchestrator = new TeamMemberChangeRequestOrchestrator();
