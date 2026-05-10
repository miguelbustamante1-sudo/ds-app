import { prisma } from './prisma';
import type { Position } from '@prisma/client';

export const TABLE = 'ds.pos_positions';

export async function ensurePositionsTableExists(): Promise<boolean> {
  try {
    await prisma.position.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllRoles(): Promise<Position[]> {
  return await prisma.position.findMany({
    orderBy: { posId: 'asc' },
  });
}

export async function getRoleById(id: number): Promise<Position | null> {
  return await prisma.position.findUnique({
    where: { posId: id },
  });
}

export async function createRole(posName: string, posDescription: string | null): Promise<Position> {
  return await prisma.position.create({
    data: {
      posName,
      posDescription,
    },
  });
}

export async function updateRole(id: number, posName: string, posDescription: string | null): Promise<Position | null> {
  return await prisma.position.update({
    where: { posId: id },
    data: {
      posName,
      posDescription,
    },
  });
}

export async function deleteRole(id: number): Promise<void> {
  await prisma.position.delete({
    where: { posId: id },
  });
}
