import type { UpdateTeamMemberDTO } from '@shared/dto';
import { updateTeamMember } from '../../teamMember';

/**
 * Applies an approved change request's diff to the team member.
 * Reuses the existing audit-logged updateTeamMember mutation — no duplicate audit write needed here.
 */
export async function applyChangeRequest(
  teamMemberId: number,
  changes: Record<string, { old: unknown; new: unknown }>,
  reviewerDsUserId: number,
  reviewerEmail: string,
): Promise<void> {
  const dto: UpdateTeamMemberDTO = {};

  if ('tierBandId' in changes) dto.tierBandId = changes.tierBandId!.new as number;
  if ('teamMemberPrimaryRole' in changes) {
    dto.teamMemberPrimaryRole = changes.teamMemberPrimaryRole!.new as number | null;
  }
  if ('teamMemberFullLegalName' in changes) {
    dto.teamMemberFullLegalName = changes.teamMemberFullLegalName!.new as string | null;
  }
  if ('teamMemberEndDate' in changes) {
    dto.teamMemberEndDate = changes.teamMemberEndDate!.new as string | null;
  }

  await updateTeamMember(teamMemberId, dto, reviewerDsUserId, reviewerEmail);
}
