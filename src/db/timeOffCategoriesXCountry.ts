import { prisma } from './prisma';
import type { CategoryCountry } from '@prisma/client';

export const TABLE = 'ds.tbl_to_categories_x_country';

/**
 * Check that the table exists (non-destructive)
 */
export async function ensureTableExists(): Promise<boolean> {
  try {
    await prisma.categoryCountry.findFirst();
    return true;
  } catch {
    return false;
  }
}

const includeRelations = {
  category: { select: { categoryName: true } },
  country: { select: { countryName: true, countryIso: true } },
};

export async function getAll() {
  return await prisma.categoryCountry.findMany({
    include: includeRelations,
    orderBy: { categoryCountryId: 'asc' },
  });
}

export async function getById(id: number) {
  return await prisma.categoryCountry.findUnique({
    where: { categoryCountryId: id },
    include: includeRelations,
  });
}

export async function getByCountry(countryId: number) {
  return await prisma.categoryCountry.findMany({
    where: { countryId },
    include: includeRelations,
    orderBy: { categoryCountryId: 'asc' },
  });
}

export async function create(
  categoryId: number,
  countryId: number,
  categoryCountryStatus: number | null = null,
  categoryCountryAllowHalfDay: boolean = false,
  categoryCountryIsFixedDuration: boolean = false,
  categoryCountryFixedDays: number | null = null,
  categoryCountryIsCalendar: boolean = false,
  categoryCountryDaysBefore: number = 0
) {
  return await prisma.categoryCountry.create({
    data: {
      categoryId,
      countryId,
      categoryCountryStatus: categoryCountryStatus ?? 1,
      categoryCountryAllowHalfDay,
      categoryCountryIsFixedDuration,
      categoryCountryFixedDays,
      categoryCountryIsCalendar,
      categoryCountryDaysBefore,
    },
    include: includeRelations,
  });
}

export async function update(
  id: number,
  categoryId: number,
  countryId: number,
  categoryCountryStatus: number | null = null,
  categoryCountryAllowHalfDay?: boolean,
  categoryCountryIsFixedDuration?: boolean,
  categoryCountryFixedDays?: number | null,
  categoryCountryIsCalendar?: boolean,
  categoryCountryDaysBefore?: number
) {
  return await prisma.categoryCountry.update({
    where: { categoryCountryId: id },
    data: {
      categoryId,
      countryId,
      categoryCountryStatus: categoryCountryStatus ?? 1,
      ...(categoryCountryAllowHalfDay !== undefined && { categoryCountryAllowHalfDay }),
      ...(categoryCountryIsFixedDuration !== undefined && { categoryCountryIsFixedDuration }),
      ...(categoryCountryFixedDays !== undefined && { categoryCountryFixedDays }),
      ...(categoryCountryIsCalendar !== undefined && { categoryCountryIsCalendar }),
      ...(categoryCountryDaysBefore !== undefined && { categoryCountryDaysBefore }),
    },
    include: includeRelations,
  });
}

export async function remove(id: number): Promise<void> {
  await prisma.categoryCountry.delete({
    where: { categoryCountryId: id },
  });
}
