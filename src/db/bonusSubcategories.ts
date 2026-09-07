import { prisma } from './prisma';
import type { CreateBonusSubcategoryDTO, UpdateBonusSubcategoryDTO } from '../../shared/dto/Endorsement';
import { info } from '../logger';

export const TABLE = 'ds.bsc_bonus_subcategories';

export async function getBonusSubcategories(countryId?: number) {
  info(`Fetching bonus subcategories from table ${TABLE}`);
  return await prisma.bonusSubcategory.findMany({
    ...(countryId ? { where: { countryId } } : {}),
    include: {
      bonusCategory: true,
      country: { select: { countryName: true } },
    },
    orderBy: { bonusSubcategoryName: 'asc' },
  });
}

export async function getBonusSubcategoryById(id: number) {
  info(`Fetching bonus subcategory ${id} from table ${TABLE}`);
  return await prisma.bonusSubcategory.findUnique({
    where: { bonusSubcategoryId: id },
    include: {
      bonusCategory: true,
      country: { select: { countryName: true } },
    },
  });
}

export async function createBonusSubcategory(data: CreateBonusSubcategoryDTO) {
  info(`Creating bonus subcategory in table ${TABLE}`);
  return await prisma.bonusSubcategory.create({
    data: {
      bonusCategoryId: data.bonusCategoryId,
      countryId: data.countryId,
      bonusSubcategoryName: data.bonusSubcategoryName,
      bonusSubcategoryMetadata: data.bonusSubcategoryMetadata,
      bonusSubcategoryDefaultAmount: data.bonusSubcategoryDefaultAmount ?? null,
    },
    include: {
      bonusCategory: true,
      country: { select: { countryName: true } },
    },
  });
}

export async function updateBonusSubcategory(id: number, data: UpdateBonusSubcategoryDTO) {
  info(`Updating bonus subcategory ${id} in table ${TABLE}`);
  return await prisma.bonusSubcategory.update({
    where: { bonusSubcategoryId: id },
    data,
    include: {
      bonusCategory: true,
      country: { select: { countryName: true } },
    },
  });
}

export async function deleteBonusSubcategory(id: number): Promise<void> {
  info(`Deleting bonus subcategory ${id} from table ${TABLE}`);
  await prisma.bonusSubcategory.delete({
    where: { bonusSubcategoryId: id },
  });
}
