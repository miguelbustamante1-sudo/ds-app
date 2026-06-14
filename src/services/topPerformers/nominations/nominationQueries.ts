import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { TpNominationDTO } from '@shared/dto/TpNomination';

export { TpNominationDTO };

const nominationSelect = {
  nomId: true,
  cycId: true,
  nomNomineeId: true,
  nomNominatorId: true,
  nomType: true,
  nomAchievementText: true,
  nomQuantitativeData: true,
  nomValuesSelected: true,
  nomValuesDescription: true,
  nomNominatorRelationship: true,
  nomAdminExceedsRole: true,
  nomAdminClientImpact: true,
  nomAdminConfidenceLevel: true,
  nomAnonymizedText: true,
  nomAnonymizationStatus: true,
  nomStatus: true,
  nomIsVozDelCliente: true,
  nomCreatedDate: true,
} as const;

type NominationRow = Prisma.TpNominationGetPayload<{ select: typeof nominationSelect }>;

function toDTO(row: NominationRow): TpNominationDTO {
  return {
    nomId: row.nomId,
    cycId: row.cycId,
    nomNomineeId: row.nomNomineeId,
    nomNominatorId: row.nomNominatorId,
    nomType: row.nomType,
    nomAchievementText: row.nomAchievementText,
    nomQuantitativeData: row.nomQuantitativeData,
    nomValuesSelected: row.nomValuesSelected as string[] | null,
    nomValuesDescription: row.nomValuesDescription,
    nomNominatorRelationship: row.nomNominatorRelationship,
    nomAdminExceedsRole: row.nomAdminExceedsRole,
    nomAdminClientImpact: row.nomAdminClientImpact,
    nomAdminConfidenceLevel: row.nomAdminConfidenceLevel,
    nomAnonymizedText: row.nomAnonymizedText,
    nomAnonymizationStatus: row.nomAnonymizationStatus,
    nomStatus: row.nomStatus,
    nomIsVozDelCliente: row.nomIsVozDelCliente,
    nomCreatedDate: row.nomCreatedDate.toISOString(),
  };
}

export async function getNominationById(nomId: number): Promise<TpNominationDTO> {
  const row = await prisma.tpNomination.findUnique({ where: { nomId }, select: nominationSelect });
  if (!row) throw new AppError('Nomination not found', 404);
  return toDTO(row);
}

export async function getNominationsByCycle(cycId: number): Promise<TpNominationDTO[]> {
  const rows = await prisma.tpNomination.findMany({
    where: { cycId, nomStatus: { not: 'DRAFT' } },
    select: nominationSelect,
    orderBy: { nomCreatedDate: 'desc' },
  });
  return rows.map(toDTO);
}

export async function getDraftNomination(
  cycId: number,
  nomNominatorId: number,
  nomNomineeId: number
): Promise<TpNominationDTO | null> {
  const row = await prisma.tpNomination.findFirst({
    where: { cycId, nomNominatorId, nomNomineeId, nomStatus: 'DRAFT' },
    select: nominationSelect,
  });
  return row ? toDTO(row) : null;
}
