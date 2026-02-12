import { prisma } from './prisma';
import type { TimeOffCategory } from '@prisma/client';
import type { CategoryByCountryDTO } from '../../shared/dto';

export const TABLE = 'ds.tbl_to_categories';

// Default country ID (Guatemala) when team member has no country assigned
const DEFAULT_COUNTRY_ID = 2;

/**
 * Check that the categories table exists (non-destructive)
 */
export async function ensureCategoriesTableExists(): Promise<boolean> {
  try {
    await prisma.timeOffCategory.findFirst();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<TimeOffCategory[]> {
  return await prisma.timeOffCategory.findMany({
    orderBy: { categoryId: 'asc' },
  });
}

/**
 * Get a category by id
 */
export async function getCategoryById(id: number): Promise<TimeOffCategory | null> {
  return await prisma.timeOffCategory.findUnique({
    where: { categoryId: id },
  });
}

/**
 * Create a new category
 */
export async function createCategory(categoryName: string): Promise<TimeOffCategory> {
  return await prisma.timeOffCategory.create({
    data: { categoryName },
  });
}

/**
 * Update a category
 */
export async function updateCategory(id: number, categoryName: string): Promise<TimeOffCategory | null> {
  return await prisma.timeOffCategory.update({
    where: { categoryId: id },
    data: { categoryName },
  });
}

/**
 * Delete a category
 */
export async function deleteCategory(id: number): Promise<void> {
  await prisma.timeOffCategory.delete({
    where: { categoryId: id },
  });
}

/**
 * Get categories by country ISO code
 */
export async function getCategoriesByCountry(countryIso: string): Promise<CategoryByCountryDTO[]> {
  const results = await prisma.timeOffCategory.findMany({
    where: {
      categoryCountries: {
        some: {
          categoryCountryStatus: 1,
          country: {
            countryIso: {
              equals: countryIso,
              mode: 'insensitive',
            },
          },
        },
      },
    },
    include: {
      categoryCountries: {
        where: {
          categoryCountryStatus: 1,
          country: {
            countryIso: {
              equals: countryIso,
              mode: 'insensitive',
            },
          },
        },
        include: {
          country: true,
        },
      },
    },
  });

  // Transform the Prisma result to match the CategoryByCountryDTO (camelCase)
  return results.flatMap((category) =>
    category.categoryCountries
      .filter((cc) => cc.country.countryIso !== null)
      .map((cc) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        categoryByCountryId: cc.categoryCountryId,
        countryId: cc.country.countryId,
        countryName: cc.country.countryName,
        countryIso: cc.country.countryIso!,
        categoryCountryAllowHalfDay: cc.categoryCountryAllowHalfDay,
        categoryCountryIsFixedDuration: cc.categoryCountryIsFixedDuration,
        categoryCountryFixedDays: cc.categoryCountryFixedDays ? Number(cc.categoryCountryFixedDays) : null,
        categoryCountryIsCalendar: cc.categoryCountryIsCalendar,
      }))
  );
}

/**
 * Get categories available for a team member based on their country.
 * If team member has no country, defaults to Guatemala (countryId = 2).
 * Returns null if team member not found.
 * Returns full category-country configuration including half-day and fixed duration settings.
 */
export async function getCategoriesByTeamMemberId(
  teamMemberId: number
): Promise<CategoryByCountryDTO[] | null> {
  // Get team member with their country
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { countryId: true },
  });

  if (!teamMember) return null;

  // Use team member's country or default to Guatemala
  const effectiveCountryId = teamMember.countryId ?? DEFAULT_COUNTRY_ID;

  // Get categories enabled for this country with full details
  const categoryCountries = await prisma.categoryCountry.findMany({
    where: {
      countryId: effectiveCountryId,
      categoryCountryStatus: 1,
    },
    include: {
      category: true,
      country: true,
    },
    orderBy: {
      category: {
        categoryName: 'asc',
      },
    },
  });

  // Transform to CategoryByCountryDTO
  return categoryCountries.map((cc) => ({
    categoryId: cc.category.categoryId,
    categoryName: cc.category.categoryName,
    categoryByCountryId: cc.categoryCountryId,
    countryId: cc.country.countryId,
    countryName: cc.country.countryName,
    countryIso: cc.country.countryIso ?? '',
    categoryCountryAllowHalfDay: cc.categoryCountryAllowHalfDay,
    categoryCountryIsFixedDuration: cc.categoryCountryIsFixedDuration,
    categoryCountryFixedDays: cc.categoryCountryFixedDays ? Number(cc.categoryCountryFixedDays) : null,
    categoryCountryIsCalendar: cc.categoryCountryIsCalendar,
  }));
}
