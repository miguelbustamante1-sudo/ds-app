import { prisma } from './prisma';
import type { TierBand } from '@prisma/client';

export const TABLE = 'ds.tib_tier_band';

export async function getAllTierBands(): Promise<TierBand[]> {
  return await prisma.tierBand.findMany({
    orderBy: { tierBandDescription: 'asc' },
  });
}

export async function getTierBandById(id: number): Promise<TierBand | null> {
  return await prisma.tierBand.findUnique({
    where: { tierBandId: id },
  });
}

export async function createTierBand(tierBandDescription: string): Promise<TierBand> {
  return await prisma.tierBand.create({
    data: { tierBandDescription },
  });
}

export async function updateTierBand(id: number, tierBandDescription: string): Promise<TierBand | null> {
  return await prisma.tierBand.update({
    where: { tierBandId: id },
    data: { tierBandDescription },
  });
}

export async function deleteTierBand(id: number): Promise<void> {
  await prisma.tierBand.delete({
    where: { tierBandId: id },
  });
}
