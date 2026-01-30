import { prisma } from './prisma';
import type { Region } from '@prisma/client';

export const TABLE = 'ds.tbl_regions';

/**
 * Check that the regions table exists (non-destructive)
 */
export async function ensureRegionsTableExists(): Promise<boolean> {
  try {
    await prisma.region.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllRegions(): Promise<Region[]> {
  return await prisma.region.findMany({
    orderBy: { regionId: 'asc' },
  });
}

export async function getRegionById(id: number): Promise<Region | null> {
  return await prisma.region.findUnique({
    where: { regionId: id },
  });
}

export async function createRegion(regionName: string): Promise<Region> {
  return await prisma.region.create({
    data: { regionName },
  });
}

export async function updateRegion(id: number, regionName: string): Promise<Region | null> {
  return await prisma.region.update({
    where: { regionId: id },
    data: { regionName },
  });
}

export async function deleteRegion(id: number): Promise<void> {
  await prisma.region.delete({
    where: { regionId: id },
  });
}
