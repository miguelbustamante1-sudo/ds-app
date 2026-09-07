import { prisma } from './prisma';
import type { Country } from '@prisma/client';
import { info } from '../logger';

export const TABLE = 'ds.cou_countries';

/**
 * Check that the countries table exists (non-destructive)
 */
export async function ensureCountriesTableExists(): Promise<boolean> {
  try {
    await prisma.country.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllCountries(): Promise<Country[]> {
  info(`Fetching all countries from table ${TABLE}`);
  return await prisma.country.findMany({
    orderBy: { countryId: 'asc' },
  });
}

export async function getCountriesByRegion(regionId: number): Promise<Country[]> {
  return await prisma.country.findMany({
    where: { regionId },
    orderBy: { countryId: 'asc' },
  });
}

export async function getCountryById(id: number): Promise<Country | null> {
  return await prisma.country.findUnique({
    where: { countryId: id },
  });
}

export async function createCountry(
  regionId: number | null,
  countryName: string,
  countryIso?: string | null,
  currencySymbol?: string | null,
  nightStart?: number | null,
  nightEnd?: number | null,
  nightMultiplier?: number | null,
): Promise<Country> {
  return await prisma.country.create({
    data: {
      regionId,
      countryName,
      countryIso: countryIso ?? null,
      countryCurrencySymbol: currencySymbol ?? null,
      nightStart: nightStart ?? null,
      nightEnd: nightEnd ?? null,
      nightMultiplier: nightMultiplier ?? null,
    },
  });
}

export async function updateCountry(
  id: number,
  regionId: number | null,
  countryName: string,
  countryIso?: string | null,
  currencySymbol?: string | null,
  nightStart?: number | null,
  nightEnd?: number | null,
  nightMultiplier?: number | null,
): Promise<Country | null> {
  return await prisma.country.update({
    where: { countryId: id },
    data: {
      regionId,
      countryName,
      countryIso: countryIso ?? null,
      countryCurrencySymbol: currencySymbol ?? null,
      nightStart: nightStart ?? null,
      nightEnd: nightEnd ?? null,
      nightMultiplier: nightMultiplier ?? null,
    },
  });
}

export async function deleteCountry(id: number): Promise<void> {
  await prisma.country.delete({
    where: { countryId: id },
  });
}
