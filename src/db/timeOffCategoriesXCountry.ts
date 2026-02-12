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

export async function getAll(): Promise<CategoryCountry[]> {
  return await prisma.categoryCountry.findMany({
    orderBy: { categoryCountryId: 'asc' },
  });
}

export async function getById(id: number): Promise<CategoryCountry | null> {
  return await prisma.categoryCountry.findUnique({
    where: { categoryCountryId: id },
  });
}

export async function getByCountry(countryId: number): Promise<CategoryCountry[]> {
  return await prisma.categoryCountry.findMany({
    where: { countryId },
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
  categoryCountryIsCalendar: boolean = false
): Promise<CategoryCountry> {
  return await prisma.categoryCountry.create({
    data: {
      categoryId,
      countryId,
      categoryCountryStatus: categoryCountryStatus ?? 1,
      categoryCountryAllowHalfDay,
      categoryCountryIsFixedDuration,
      categoryCountryFixedDays,
      categoryCountryIsCalendar,
    },
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
  categoryCountryIsCalendar?: boolean
): Promise<CategoryCountry | null> {
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
    },
  });
}

export async function remove(id: number): Promise<void> {
  await prisma.categoryCountry.delete({
    where: { categoryCountryId: id },
  });
}
