import { prisma } from './prisma';
import type { BonusCategory } from '@prisma/client';
import { info } from '../logger';

export const TABLE = 'ds.bca_bonus_categories';

export async function getBonusCategories(): Promise<BonusCategory[]> {
  info(`Fetching all bonus categories from table ${TABLE}`);
  return await prisma.bonusCategory.findMany({
    orderBy: { bonusCategoryName: 'asc' },
  });
}

export async function getBonusCategoryById(id: number) {
  info(`Fetching bonus category ${id} from table ${TABLE}`);
  return await prisma.bonusCategory.findUnique({
    where: { bonusCategoryId: id },
    include: {
      bonusSubcategories: true,
    },
  });
}

export async function createBonusCategory(bonusCategoryName: string): Promise<BonusCategory> {
  info(`Creating bonus category in table ${TABLE}`);
  return await prisma.bonusCategory.create({
    data: { bonusCategoryName },
  });
}

export async function updateBonusCategory(id: number, bonusCategoryName: string): Promise<BonusCategory | null> {
  info(`Updating bonus category ${id} in table ${TABLE}`);
  return await prisma.bonusCategory.update({
    where: { bonusCategoryId: id },
    data: { bonusCategoryName },
  });
}

export async function deleteBonusCategory(id: number): Promise<void> {
  info(`Deleting bonus category ${id} from table ${TABLE}`);
  await prisma.bonusCategory.delete({
    where: { bonusCategoryId: id },
  });
}
