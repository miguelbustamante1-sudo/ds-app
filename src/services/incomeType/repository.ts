import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { IncomeTypeDTO } from '@shared/dto/IncomeType';

export const TABLE = 'itp_income_types';

export async function getAllIncomeTypes(): Promise<IncomeTypeDTO[]> {
  return prisma.incomeType.findMany({ orderBy: { incomeTypeId: 'asc' } });
}

export async function getActiveIncomeTypes(): Promise<IncomeTypeDTO[]> {
  return prisma.incomeType.findMany({
    where: { incomeTypeIsActive: true },
    orderBy: { incomeTypeName: 'asc' },
  });
}

export async function getIncomeTypeById(id: number): Promise<IncomeTypeDTO | null> {
  return prisma.incomeType.findUnique({ where: { incomeTypeId: id } });
}

export async function findActiveIncomeTypeByName(name: string): Promise<IncomeTypeDTO | null> {
  return prisma.incomeType.findFirst({
    where: { incomeTypeName: { equals: name, mode: 'insensitive' }, incomeTypeIsActive: true },
  });
}

export async function createIncomeType(
  payload: Prisma.IncomeTypeUncheckedCreateInput,
): Promise<IncomeTypeDTO> {
  return prisma.incomeType.create({ data: payload });
}

export async function updateIncomeType(
  id: number,
  payload: Prisma.IncomeTypeUncheckedUpdateInput,
): Promise<IncomeTypeDTO> {
  return prisma.incomeType.update({ where: { incomeTypeId: id }, data: payload });
}

export async function deleteIncomeType(id: number): Promise<void> {
  await prisma.incomeType.delete({ where: { incomeTypeId: id } });
}
