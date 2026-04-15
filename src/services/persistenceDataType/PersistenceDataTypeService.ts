/**
 * Persistence Data Type - Service (Business Logic Layer)
 *
 * Responsibility: orchestrate business operations on persistence data types.
 * Depends on the repository abstraction (DIP).
 */

import type { PersistenceDataTypeRecord, PaginationOptions } from './repository';
import { getAllPersistenceDataTypes } from './repository';

/** Minimal interface the service depends on (DIP) */
export interface IPersistenceDataTypeRepository {
  getAll(pagination: PaginationOptions): Promise<PersistenceDataTypeRecord[]>;
}

/** Default repository adapter */
const defaultRepository: IPersistenceDataTypeRepository = {
  getAll: getAllPersistenceDataTypes,
};

export class PersistenceDataTypeService {
  private readonly repository: IPersistenceDataTypeRepository;

  constructor(repository: IPersistenceDataTypeRepository = defaultRepository) {
    this.repository = repository;
  }

  /**
   * Retrieves a paginated list of persistence data types.
   * Defaults: page = 1, limit = 10 (max 100) — matching ticads.yaml spec.
   */
  async getAll(pagination?: Partial<PaginationOptions>): Promise<PersistenceDataTypeRecord[]> {
    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 10));
    return this.repository.getAll({ page, limit });
  }
}

/** Singleton instance used by the route layer */
export const persistenceDataTypeService = new PersistenceDataTypeService();
