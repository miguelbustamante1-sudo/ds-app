import { prisma } from '../../../db/prisma';
import { BonusImpactDTO } from '../../../../shared/dto/BonusImpact';

function toDTO(r: {
  bniId: number;
  bniTeamMemberId: number;
  teamMember: { teamMemberNames: string; teamMemberSurnames: string };
  bniDescription: string;
  bniComment: string | null;
  bniAmount: { toString(): string };
  bniCurrency: string;
  bniMonth: Date;
  bniStatus: string;
  bniPrlId: number | null;
  bniNotifiedAt: Date | null;
  bniProcessedAt: Date | null;
  bniCreatedAt: Date;
}): BonusImpactDTO {
  return {
    bniId: r.bniId,
    bniTeamMemberId: r.bniTeamMemberId,
    teamMemberNames: r.teamMember.teamMemberNames,
    teamMemberSurnames: r.teamMember.teamMemberSurnames,
    bniDescription: r.bniDescription,
    bniComment: r.bniComment,
    bniAmount: r.bniAmount.toString(),
    bniCurrency: r.bniCurrency,
    bniMonth: r.bniMonth.toISOString(),
    bniStatus: r.bniStatus as BonusImpactDTO['bniStatus'],
    bniPrlId: r.bniPrlId,
    bniNotifiedAt: r.bniNotifiedAt?.toISOString() ?? null,
    bniProcessedAt: r.bniProcessedAt?.toISOString() ?? null,
    bniCreatedAt: r.bniCreatedAt.toISOString(),
  };
}

const WITH_TEAM_MEMBER = {
  teamMember: {
    select: { teamMemberNames: true, teamMemberSurnames: true },
  },
} as const;

export async function listBonusImpacts(teamMemberIds?: number[]): Promise<BonusImpactDTO[]> {
  const rows = await prisma.bniBonus.findMany({
    where: {
      bniDeletedAt: null,
      ...(teamMemberIds && { bniTeamMemberId: { in: teamMemberIds } }),
    },
    include: WITH_TEAM_MEMBER,
    orderBy: { bniCreatedAt: 'desc' },
  });
  return rows.map(toDTO);
}

export async function findBonusImpactById(bniId: number): Promise<BonusImpactDTO | null> {
  const row = await prisma.bniBonus.findFirst({
    where: { bniId, bniDeletedAt: null },
    include: WITH_TEAM_MEMBER,
  });
  return row ? toDTO(row) : null;
}

export async function fetchRawBonusImpactRow(bniId: number) {
  return prisma.bniBonus.findFirst({ where: { bniId } });
}
