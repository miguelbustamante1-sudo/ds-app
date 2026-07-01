import { prisma } from './prisma';
import type {
  StoredProcedureDTO,
  StoredProcedureSummaryDTO,
  CreateStoredProcedureDTO,
  UpdateStoredProcedureDTO,
} from '@shared/dto/StoredProcedure';

/**
 * List all active stored procedures (for the run wizard)
 */
export async function listActiveProcedures(): Promise<StoredProcedureSummaryDTO[]> {
  const rows = await prisma.storedProcedure.findMany({
    where: { spActive: true },
    select: {
      spId: true,
      spLabel: true,
      spDescription: true,
      spActive: true,
    },
  });
  return rows;
}

/**
 * List all stored procedures including inactive (for admin management)
 */
export async function listAllProcedures(): Promise<StoredProcedureDTO[]> {
  const rows = await prisma.storedProcedure.findMany({
    orderBy: { spCreatedAt: 'desc' },
  });
  return rows.map(normalizeStoredProcedure);
}

/**
 * Get a single procedure by ID
 */
export async function getProcedureById(spId: number): Promise<StoredProcedureDTO | null> {
  const proc = await prisma.storedProcedure.findUnique({ where: { spId } });
  return proc ? normalizeStoredProcedure(proc) : null;
}

/**
 * Create a new procedure registry entry
 */
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
    data: {
      ...data,
      spCreatedBy: dsUserId,
    },
  });
  return normalizeStoredProcedure(created);
}

/**
 * Update a procedure entry
 */
export async function updateProcedure(
  spId: number,
  data: UpdateStoredProcedureDTO,
  dsUserId: number,
): Promise<StoredProcedureDTO> {
  const updated = await prisma.storedProcedure.update({
    where: { spId },
    data: {
      ...data,
      spUpdatedBy: dsUserId,
      spUpdatedAt: new Date(),
    },
  });
  return normalizeStoredProcedure(updated);
}

/**
 * Soft-delete a procedure (set spActive = false)
 */
export async function softDeleteProcedure(
  spId: number,
  dsUserId: number,
): Promise<StoredProcedureDTO> {
  const updated = await prisma.storedProcedure.update({
    where: { spId },
    data: {
      spActive: false,
      spUpdatedBy: dsUserId,
      spUpdatedAt: new Date(),
    },
  });
  return normalizeStoredProcedure(updated);
}

/**
 * Normalize Prisma row to DTO
 */
function normalizeStoredProcedure(row: any): StoredProcedureDTO {
  return {
    spId: row.spId,
    spSchema: row.spSchema,
    spName: row.spName,
    spLabel: row.spLabel,
    spDescription: row.spDescription,
    spActive: row.spActive,
    spCreatedAt: row.spCreatedAt.toISOString(),
    spCreatedBy: row.spCreatedBy,
    spUpdatedAt: row.spUpdatedAt?.toISOString() || null,
    spUpdatedBy: row.spUpdatedBy,
  };
}
