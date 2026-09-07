import { prisma } from './prisma';
import type { FieldglassSow } from '@prisma/client';
import type { CreateFieldglassSowDTO, UpdateFieldglassSowDTO } from '../../shared/dto/FieldglassSow';

export async function getAllFieldglassSows(): Promise<FieldglassSow[]> {
  return prisma.fieldglassSow.findMany({
    where: { deleted: false },
    orderBy: { sowName: 'asc' },
  });
}

export async function getAllDeactivatedFieldglassSows(): Promise<FieldglassSow[]> {
  return prisma.fieldglassSow.findMany({
    where: { deleted: true },
    orderBy: { deletedAt: 'desc' },
  });
}

export async function getFieldglassSowById(id: number): Promise<FieldglassSow | null> {
  return prisma.fieldglassSow.findUnique({ where: { fgsId: id } });
}

export async function createFieldglassSow(
  data: CreateFieldglassSowDTO,
  createdByUserId: number,
): Promise<FieldglassSow> {
  return prisma.fieldglassSow.create({
    data: {
      sowName: data.sowName ?? null,
      sowId: data.sowId ?? null,
      sowOwner: data.sowOwner ?? null,
      backupSowOwner: data.backupSowOwner ?? null,
      tdxSowCreatorsPrimary: data.tdxSowCreatorsPrimary ?? null,
      tdxSowCreatorsDelegate: data.tdxSowCreatorsDelegate ?? null,
      tdxTaPrimePrimary: data.tdxTaPrimePrimary ?? null,
      tdxTaPrimeDelegate: data.tdxTaPrimeDelegate ?? null,
      tdxProfileWorkerCreatorsPrimary: data.tdxProfileWorkerCreatorsPrimary ?? null,
      tdxProfileWorkerCreatorsDelegate: data.tdxProfileWorkerCreatorsDelegate ?? null,
      createdBy: createdByUserId,
    },
  });
}

export async function updateFieldglassSow(
  id: number,
  data: UpdateFieldglassSowDTO,
  updatedByUserId: number,
): Promise<FieldglassSow> {
  return prisma.fieldglassSow.update({
    where: { fgsId: id },
    data: {
      ...(data.sowName !== undefined ? { sowName: data.sowName } : {}),
      ...(data.sowId !== undefined ? { sowId: data.sowId } : {}),
      ...(data.sowOwner !== undefined ? { sowOwner: data.sowOwner } : {}),
      ...(data.backupSowOwner !== undefined ? { backupSowOwner: data.backupSowOwner } : {}),
      ...(data.tdxSowCreatorsPrimary !== undefined ? { tdxSowCreatorsPrimary: data.tdxSowCreatorsPrimary } : {}),
      ...(data.tdxSowCreatorsDelegate !== undefined ? { tdxSowCreatorsDelegate: data.tdxSowCreatorsDelegate } : {}),
      ...(data.tdxTaPrimePrimary !== undefined ? { tdxTaPrimePrimary: data.tdxTaPrimePrimary } : {}),
      ...(data.tdxTaPrimeDelegate !== undefined ? { tdxTaPrimeDelegate: data.tdxTaPrimeDelegate } : {}),
      ...(data.tdxProfileWorkerCreatorsPrimary !== undefined ? { tdxProfileWorkerCreatorsPrimary: data.tdxProfileWorkerCreatorsPrimary } : {}),
      ...(data.tdxProfileWorkerCreatorsDelegate !== undefined ? { tdxProfileWorkerCreatorsDelegate: data.tdxProfileWorkerCreatorsDelegate } : {}),
      lastUpdatedBy: updatedByUserId,
      lastUpdatedAt: new Date(),
    },
  });
}

export async function reactivateFieldglassSow(
  id: number,
  updatedByUserId: number,
): Promise<FieldglassSow> {
  return prisma.fieldglassSow.update({
    where: { fgsId: id },
    data: {
      deleted: false,
      deletedAt: null,
      lastUpdatedBy: updatedByUserId,
      lastUpdatedAt: new Date(),
    },
  });
}

export async function deactivateFieldglassSow(
  id: number,
  updatedByUserId: number,
): Promise<FieldglassSow> {
  return prisma.fieldglassSow.update({
    where: { fgsId: id },
    data: {
      deleted: true,
      deletedAt: new Date(),
      lastUpdatedBy: updatedByUserId,
      lastUpdatedAt: new Date(),
    },
  });
}
