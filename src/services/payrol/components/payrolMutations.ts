import { prisma } from '../../../db/prisma';
import type { PrlPayrol } from '@prisma/client';
import { CreatePayrolDTO, UpdatePayrolDTO } from '../../../../shared/dto/Payrol';
import { AppError } from '../../../errors/AppError';

export async function createPayrol(dto: CreatePayrolDTO, createdBy: number): Promise<PrlPayrol> {
  return prisma.prlPayrol.create({
    data: {
      prlDescription: dto.prlDescription,
      prlStartDate: new Date(dto.prlStartDate),
      prlEndDate: new Date(dto.prlEndDate),
      prlStatus: 'Open',
      prlCreatedBy: createdBy,
      prlUpdatedBy: createdBy,
    },
  });
}

export async function updatePayrol(prlId: number, dto: UpdatePayrolDTO, updatedBy: number): Promise<{ before: PrlPayrol; after: PrlPayrol }> {
  const existing = await prisma.prlPayrol.findFirst({
    where: { prlId, prlDeletedAt: null },
  });
  if (!existing) throw new AppError('Payrol period not found', 404);
  if (existing.prlStatus !== 'Open') {
    throw new AppError('Only Open payrol periods can be edited', 400);
  }
  const after = await prisma.prlPayrol.update({
    where: { prlId },
    data: {
      ...(dto.prlDescription !== undefined && { prlDescription: dto.prlDescription }),
      ...(dto.prlStartDate !== undefined && { prlStartDate: new Date(dto.prlStartDate) }),
      ...(dto.prlEndDate !== undefined && { prlEndDate: new Date(dto.prlEndDate) }),
      prlUpdatedBy: updatedBy,
    },
  });
  return { before: existing, after };
}

export async function closePayrol(prlId: number, updatedBy: number): Promise<{ before: PrlPayrol; after: PrlPayrol }> {
  const existing = await prisma.prlPayrol.findFirst({
    where: { prlId, prlDeletedAt: null },
  });
  if (!existing) throw new AppError('Payrol period not found', 404);
  if (existing.prlStatus === 'Closed') {
    throw new AppError('Payrol period is already closed', 400);
  }
  const after = await prisma.prlPayrol.update({
    where: { prlId },
    data: { prlStatus: 'Closed', prlUpdatedBy: updatedBy },
  });
  return { before: existing, after };
}

export async function dropPayrol(prlId: number, updatedBy: number): Promise<{ before: PrlPayrol; after: PrlPayrol }> {
  const existing = await prisma.prlPayrol.findFirst({
    where: { prlId, prlDeletedAt: null },
  });
  if (!existing) throw new AppError('Payrol period not found', 404);
  if (existing.prlStatus === 'Closed') throw new AppError('Closed payrol periods cannot be dropped', 400);
  const after = await prisma.prlPayrol.update({
    where: { prlId },
    data: { prlDeletedAt: new Date(), prlUpdatedBy: updatedBy },
  });
  return { before: existing, after };
}
