import { prisma } from './prisma';
import type { EndorsementBonus } from '@prisma/client';
import { info } from '../logger';

export const TABLE = 'ds.ebn_endorsement_bonus';

const ENDORSEMENT_BONUS_INCLUDE = {
  bonusSubcategory: {
    include: {
      bonusCategory: true,
    },
  },
};

export async function getEndorsementBonusesByEndorsementId(endorsementId: number): Promise<EndorsementBonus[]> {
  info(`Fetching endorsement bonuses for endorsement ${endorsementId} from table ${TABLE}`);
  return await prisma.endorsementBonus.findMany({
    where: { endorsementId },
    include: ENDORSEMENT_BONUS_INCLUDE,
    orderBy: { endorsementBonusCreatedAt: 'desc' },
  });
}

export async function getEndorsementBonusById(id: number) {
  info(`Fetching endorsement bonus ${id} from table ${TABLE}`);
  return await prisma.endorsementBonus.findUnique({
    where: { endorsementBonusId: id },
    include: ENDORSEMENT_BONUS_INCLUDE,
  });
}

export async function createEndorsementBonus(data: {
  endorsementId: number;
  bonusSubcategoryId?: number | null;
  endorsementBonusAmount?: number | null;
  endorsementBonusMetadata?: unknown;
  endorsementBonusComments?: string | null;
  endorsementBonusCreatedBy?: string | null;
}): Promise<EndorsementBonus> {
  info(`Creating endorsement bonus in table ${TABLE}`);
  return await prisma.endorsementBonus.create({
    data: {
      endorsementId: data.endorsementId,
      bonusSubcategoryId: data.bonusSubcategoryId ?? null,
      endorsementBonusAmount: data.endorsementBonusAmount ?? null,
      endorsementBonusMetadata: (data.endorsementBonusMetadata as object) ?? {},
      endorsementBonusComments: data.endorsementBonusComments ?? null,
      endorsementBonusCreatedBy: data.endorsementBonusCreatedBy ?? null,
    },
    include: ENDORSEMENT_BONUS_INCLUDE,
  });
}

export async function updateEndorsementBonus(
  id: number,
  data: Record<string, unknown>,
) {
  info(`Updating endorsement bonus ${id} in table ${TABLE}`);
  return await prisma.endorsementBonus.update({
    where: { endorsementBonusId: id },
    data,
    include: ENDORSEMENT_BONUS_INCLUDE,
  });
}

export async function deleteEndorsementBonus(id: number) {
  info(`Deleting endorsement bonus ${id} from table ${TABLE}`);
  await prisma.endorsementBonus.delete({
    where: { endorsementBonusId: id },
  });
}
