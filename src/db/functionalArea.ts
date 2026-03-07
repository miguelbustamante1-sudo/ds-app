import { prisma } from './prisma';
import type { FunctionalArea } from '@prisma/client';
import type { CreateFunctionalAreaDTO, UpdateFunctionalAreaDTO } from '../../shared/dto/FunctionalArea';

export async function getAllFunctionalAreas(): Promise<FunctionalArea[]> {
  return await prisma.functionalArea.findMany({
    orderBy: { Name: 'asc' },
  });
}

export async function getFunctionalAreaById(id: number): Promise<FunctionalArea | null> {
  return await prisma.functionalArea.findUnique({
    where: { Id: id },
  });
}

export async function createFunctionalArea(data: CreateFunctionalAreaDTO): Promise<FunctionalArea> {
  return await prisma.functionalArea.create({
    data: {
      Name: data.Name,
      countryId: data.countryId ?? null,
    },
  });
}

export async function updateFunctionalArea(id: number, data: UpdateFunctionalAreaDTO): Promise<FunctionalArea> {
  return await prisma.functionalArea.update({
    where: { Id: id },
    data: {
      ...(data.Name !== undefined ? { Name: data.Name } : {}),
      ...(data.countryId !== undefined ? { countryId: data.countryId } : {}),
    },
  });
}

export async function deleteFunctionalArea(id: number): Promise<void> {
  await prisma.functionalArea.delete({
    where: { Id: id },
  });
}
