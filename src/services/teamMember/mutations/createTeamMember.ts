import type { TeamMember, Prisma } from '@prisma/client';
import type { CreateTeamMemberDTO } from '../../../../shared/dto';
import { createTeamMember as dbCreate } from '../../../db/teamMembers';
import { getTierBandById } from '../../../db/tierBands';
import { auditOrchestrator } from '../../audit';
import { InvalidTierBandError } from './errors';

export async function createTeamMember(
  dto: CreateTeamMemberDTO,
  userId: number | null,
  email: string,
): Promise<TeamMember> {
  const tierBand = await getTierBandById(dto.tierBandId);
  if (!tierBand) throw new InvalidTierBandError('Invalid tierBandId');

  const now = new Date();

  const data: Prisma.TeamMemberUncheckedCreateInput = {
    teamMemberNames:          dto.teamMemberNames,
    teamMemberSurnames:       dto.teamMemberSurnames,
    teamMemberSeniority:      tierBand.tierBandDescription,
    teamMemberStartDate:      typeof dto.teamMemberStartDate === 'string'
                                ? new Date(dto.teamMemberStartDate)
                                : dto.teamMemberStartDate,
    teamMemberKnownAs:        dto.teamMemberKnownAs,
    teamMemberFullLegalName:  dto.teamMemberFullLegalName ?? null,
    workdayId:                dto.workdayId ?? null,
    teamMemberCreatedBy:      userId,
    teamMemberCreatedDate:    now,
    teamMemberLastUpdatedBy:  userId,
    teamMemberLastUpdatedDate: now,
    teamMemberPrimaryRole:    dto.teamMemberPrimaryRole,
    countryId:                dto.countryId,
    tierBandId:               dto.tierBandId,
    shiftId:                  dto.shiftId ?? null,
    teamMemberXid:            dto.teamMemberXid ?? null,
  };

  const created = await dbCreate(data);

  await auditOrchestrator.log({
    entityName: 'tbl_team_members',
    entityId:   String(created.teamMemberId),
    createdBy:  email,
    oldValues:  null,
    newValues:  created,
    comment:    `Team member ${created.teamMemberNames} ${created.teamMemberSurnames} created`,
  });

  return created;
}
