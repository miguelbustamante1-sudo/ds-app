import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { TeamMemberReimbursementDTO } from '@shared/dto/TeamMemberReimbursement';

export const TABLE = 'tmr_team_member_reimbursements';

const includeRelations = {
  teamMember: {
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      workdayId: true,
    },
  },
  payrol: {
    select: {
      prlId: true,
      prlDescription: true,
      prlMonth: true,
      prlYear: true,
    },
  },
} satisfies Prisma.TmrTeamMemberReimbursementInclude;

type ReimbursementWithRelations = Prisma.TmrTeamMemberReimbursementGetPayload<{
  include: typeof includeRelations;
}>;

function toDTO(r: ReimbursementWithRelations): TeamMemberReimbursementDTO {
  return {
    reimbursementId: r.reimbursementId,
    teamMemberId: r.teamMemberId,
    reimbursementAmount: r.reimbursementAmount.toString(),
    reimbursementDate: r.reimbursementDate.toISOString(),
    payrolId: r.payrolId,
    reimbursementFrequency: r.reimbursementFrequency,
    reimbursementCreatedBy: r.reimbursementCreatedBy,
    reimbursementCreatedAt: r.reimbursementCreatedAt.toISOString(),
    reimbursementUpdatedBy: r.reimbursementUpdatedBy,
    reimbursementUpdatedAt: r.reimbursementUpdatedAt.toISOString(),
    teamMember: r.teamMember,
    payrol: r.payrol,
  };
}

export async function getAllTeamMemberReimbursements(): Promise<TeamMemberReimbursementDTO[]> {
  const results = await prisma.tmrTeamMemberReimbursement.findMany({
    include: includeRelations,
    orderBy: { reimbursementId: 'asc' },
  });
  return results.map(toDTO);
}

export async function getTeamMemberReimbursementById(
  id: number,
): Promise<TeamMemberReimbursementDTO | null> {
  const result = await prisma.tmrTeamMemberReimbursement.findUnique({
    where: { reimbursementId: id },
    include: includeRelations,
  });
  return result ? toDTO(result) : null;
}

export async function createTeamMemberReimbursement(
  payload: Prisma.TmrTeamMemberReimbursementUncheckedCreateInput,
): Promise<TeamMemberReimbursementDTO> {
  const result = await prisma.tmrTeamMemberReimbursement.create({
    data: payload,
    include: includeRelations,
  });
  return toDTO(result);
}

export async function updateTeamMemberReimbursement(
  id: number,
  payload: Prisma.TmrTeamMemberReimbursementUncheckedUpdateInput,
): Promise<TeamMemberReimbursementDTO> {
  const result = await prisma.tmrTeamMemberReimbursement.update({
    where: { reimbursementId: id },
    data: payload,
    include: includeRelations,
  });
  return toDTO(result);
}

export async function deleteTeamMemberReimbursement(id: number): Promise<void> {
  await prisma.tmrTeamMemberReimbursement.delete({
    where: { reimbursementId: id },
  });
}
