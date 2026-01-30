import { prisma } from './prisma';
import type { Holiday, Prisma } from '@prisma/client';
import { info } from '../logger';

export const TABLE = 'ds.hol_holiday';

/**
 * Check that the holidays table exists (non-destructive)
 */
export async function ensureHolidaysTableExists(): Promise<boolean> {
  try {
    await prisma.holiday.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllHolidays(): Promise<Holiday[]> {
  info(`Fetching all holidays from table ${TABLE}`);
  return await prisma.holiday.findMany({
    where: { holidayIsActive: true },
    orderBy: { holidayDate: 'asc' },
  });
}

export async function getAllHolidaysWithCountry() {
  info(`Fetching all holidays with country details from table ${TABLE}`);
  return await prisma.holiday.findMany({
    where: { holidayIsActive: true },
    include: {
      country: {
        select: {
          countryId: true,
          countryName: true,
        },
      },
    },
    orderBy: { holidayDate: 'asc' },
  });
}

export async function getHolidaysByCountry(countryId: number): Promise<Holiday[]> {
  info(`Fetching holidays for country ${countryId}`);
  return await prisma.holiday.findMany({
    where: { countryId, holidayIsActive: true },
    orderBy: { holidayDate: 'asc' },
  });
}

export async function getHolidayById(id: number): Promise<Holiday | null> {
  return await prisma.holiday.findUnique({
    where: { holidayId: id },
  });
}

export async function createHoliday(payload: Prisma.HolidayCreateInput): Promise<Holiday> {
  info(`Creating new holiday`);
  return await prisma.holiday.create({
    data: payload,
  });
}

export async function updateHoliday(id: number, payload: Prisma.HolidayUpdateInput): Promise<Holiday | null> {
  info(`Updating holiday ${id}`);
  return await prisma.holiday.update({
    where: { holidayId: id },
    data: payload,
  });
}

export async function deleteHoliday(id: number): Promise<void> {
  info(`Soft deleting holiday ${id}`);
  await prisma.holiday.update({
    where: { holidayId: id },
    data: {
      holidayIsActive: false,
      holidayDeletedAt: new Date(),
    },
  });
}
