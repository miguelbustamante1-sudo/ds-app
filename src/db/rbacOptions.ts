import { prisma } from './prisma';
import type { Option } from '@prisma/client';

export const TABLE = 'sec.opt_options';

export async function getAllRbacOptions(): Promise<Option[]> {
  return await prisma.option.findMany({
    orderBy: { optionDescription: 'asc' },
  });
}

export async function getRbacOptionById(id: number): Promise<Option | null> {
  return await prisma.option.findUnique({
    where: { optionId: id },
  });
}

export async function createRbacOption(
  optionDescription: string | null,
  optionCreatedBy: string | null
): Promise<Option> {
  return await prisma.option.create({
    data: {
      optionDescription,
      optionCreatedBy,
    },
  });
}

export async function updateRbacOption(
  id: number,
  optionDescription: string | null
): Promise<Option | null> {
  return await prisma.option.update({
    where: { optionId: id },
    data: {
      optionDescription,
    },
  });
}

export async function deleteRbacOption(id: number): Promise<void> {
  await prisma.option.delete({
    where: { optionId: id },
  });
}
