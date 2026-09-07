import type { StoredProcedure } from '@prisma/client';
import { prisma } from './prisma';
import type {
  StoredProcedureDTO,
  StoredProcedureSummaryDTO,
  UpdateStoredProcedureDTO,
} from '@shared/dto/StoredProcedure';

export async function listActiveProcedures(): Promise<StoredProcedureSummaryDTO[]> {
  return prisma.storedProcedure.findMany({
    where: { spActive: true },
    select: {
      spId: true,
      spLabel: true,
      spDescription: true,
      spActive: true,
    },
  });
}

export async function listAllProcedures(): Promise<StoredProcedureDTO[]> {
  const rows = await prisma.storedProcedure.findMany({
    orderBy: { spCreatedAt: 'desc' },
  });
  return rows.map(toDTO);
}

export async function getProcedureById(spId: number): Promise<StoredProcedureDTO | null> {
  const proc = await prisma.storedProcedure.findUnique({ where: { spId } });
  return proc ? toDTO(proc) : null;
}

export async function createProcedure(
  data: {
    spSchema: string;
    spName: string;
    spLabel: string;
    spDescription: string | null;
    spActive: boolean;
  },
  dsUserId: number,
): Promise<StoredProcedureDTO> {
  const created = await prisma.storedProcedure.create({
    data: { ...data, spCreatedBy: dsUserId },
  });
  return toDTO(created);
}

export async function updateProcedure(
  spId: number,
  data: UpdateStoredProcedureDTO,
  dsUserId: number,
): Promise<StoredProcedureDTO> {
  const updated = await prisma.storedProcedure.update({
    where: { spId },
    data: { ...data, spUpdatedBy: dsUserId, spUpdatedAt: new Date() },
  });
  return toDTO(updated);
}

export async function softDeleteProcedure(spId: number, dsUserId: number): Promise<StoredProcedureDTO> {
  const updated = await prisma.storedProcedure.update({
    where: { spId },
    data: { spActive: false, spUpdatedBy: dsUserId, spUpdatedAt: new Date() },
  });
  return toDTO(updated);
}

function toDTO(row: StoredProcedure): StoredProcedureDTO {
  return {
    spId: row.spId,
    spSchema: row.spSchema,
    spName: row.spName,
    spLabel: row.spLabel,
    spDescription: row.spDescription,
    spActive: row.spActive,
    spCreatedAt: row.spCreatedAt.toISOString(),
    spCreatedBy: row.spCreatedBy,
    spUpdatedAt: row.spUpdatedAt?.toISOString() ?? null,
    spUpdatedBy: row.spUpdatedBy,
  };
}
