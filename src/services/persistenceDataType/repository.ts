/**
 * Persistence Data Type - Repository (Data Access Layer)
 *
 * Responsibility: raw data access for persistence data types.
 * Maps to the `pdt_persistence_data_types` table via Prisma.
 */

import { prisma } from '../../db/prisma';

// --- Record types -------------------------------------------------------------

export interface PersistenceDataTypeRecord {
  id: number;
  index: number;
  name: string;
  regularExpression: string | null;
  example: string | null;
}

// --- Pagination ---------------------------------------------------------------

export interface PaginationOptions {
  /** 1-based page number (default: 1) */
  page: number;
  /** Items per page (default: 10, max: 100) */
  limit: number;
}

// --- Query functions ----------------------------------------------------------

/**
 * Returns a paginated slice of persistence data types ordered by index ascending.
 */
export async function getAllPersistenceDataTypes(
  pagination: PaginationOptions
): Promise<PersistenceDataTypeRecord[]> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  return prisma.persistenceDataType.findMany({
    select: {
      id: true,
      index: true,
      name: true,
      regularExpression: true,
      example: true,
    },
    orderBy: { index: 'asc' },
    skip,
    take: limit,
  });
}
