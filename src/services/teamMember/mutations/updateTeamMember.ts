import type { TeamMember, Prisma } from '@prisma/client';
import type { UpdateTeamMemberDTO } from '../../../../shared/dto';
import { getTeamMemberById, updateTeamMember as dbUpdate } from '../../../db/teamMembers';
import { auditOrchestrator } from '../../audit';
import { prisma } from '../../../db/prisma';
import { TeamMemberNotFoundError, InvalidTierBandError } from './errors';

export async function updateTeamMember(
  id: number,
  dto: UpdateTeamMemberDTO,
  userId: number | null,
  email: string,
): Promise<TeamMember> {
  const before = await getTeamMemberById(id);
  if (!before) throw new TeamMemberNotFoundError('Team member not found');

  const data: Prisma.TeamMemberUncheckedUpdateInput = {
    teamMemberLastUpdatedBy:   userId,
    teamMemberLastUpdatedDate: new Date(),
  };

  if (dto.teamMemberNames !== undefined)        data.teamMemberNames        = dto.teamMemberNames;
  if (dto.teamMemberSurnames !== undefined)     data.teamMemberSurnames     = dto.teamMemberSurnames;
  if (dto.teamMemberKnownAs !== undefined)      data.teamMemberKnownAs      = dto.teamMemberKnownAs;
  if (dto.teamMemberFullLegalName !== undefined) data.teamMemberFullLegalName = dto.teamMemberFullLegalName;
  if (dto.teamMemberPrimaryRole !== undefined)  data.teamMemberPrimaryRole  = dto.teamMemberPrimaryRole;
  if (dto.countryId !== undefined)              data.countryId              = dto.countryId;
  if (dto.workdayId !== undefined)              data.workdayId              = dto.workdayId;
  if (dto.shiftId !== undefined)                data.shiftId                = dto.shiftId;

  if (dto.tierBandId !== undefined) {
    const tierBand = await prisma.tierBand.findUnique({ where: { tierBandId: dto.tierBandId } });
    if (!tierBand) throw new InvalidTierBandError('Invalid tierBandId');
    data.tierBandId          = dto.tierBandId;
    data.teamMemberSeniority = tierBand.tierBandDescription;
  }

  if (dto.teamMemberStartDate !== undefined) {
    data.teamMemberStartDate = typeof dto.teamMemberStartDate === 'string'
      ? new Date(dto.teamMemberStartDate)
      : dto.teamMemberStartDate;
  }

  if (dto.teamMemberEndDate !== undefined) {
    data.teamMemberEndDate = dto.teamMemberEndDate === null
      ? null
      : typeof dto.teamMemberEndDate === 'string'
        ? new Date(dto.teamMemberEndDate)
        : dto.teamMemberEndDate;
  }

  const updated = await dbUpdate(id, data);
  if (!updated) throw new TeamMemberNotFoundError('Team member not found');

  await auditOrchestrator.log({
    entityName: 'tbl_team_members',
    entityId:   String(id),
    createdBy:  email,
    oldValues:  before,
    newValues:  updated,
    comment:    `Team member ${updated.teamMemberNames} ${updated.teamMemberSurnames} updated`,
  });

  return updated;
}
