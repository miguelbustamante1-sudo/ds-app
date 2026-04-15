/**
 * Persistence Table - Service (Business Logic Layer)
 *
 * Responsibility: orchestrate business operations on persistence tables.
 * Depends on the repository abstraction (DIP).
 */

import type { PersistenceTable } from '../../../shared/dto/PersistenceTable';
import type { PaginationOptions } from './repository';
import { getAllPersistenceTables } from './repository';

/** Minimal interface the service depends on (DIP) */
export interface IPersistenceTableRepository {
  getAll(pagination: PaginationOptions): Promise<PersistenceTable[]>;
}

/** Default repository adapter */
const defaultRepository: IPersistenceTableRepository = {
  getAll: getAllPersistenceTables,
};

export class PersistenceTableService {
  private readonly repository: IPersistenceTableRepository;

  constructor(repository: IPersistenceTableRepository = defaultRepository) {
    this.repository = repository;
  }

  /**
   * Retrieves a paginated list of persistence tables with their columns.
   * Defaults: page = 1, limit = 10 (max 100) — matching ticads.yaml spec.
   */
  async getAll(pagination?: Partial<PaginationOptions>): Promise<PersistenceTable[]> {
    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 10));
    return this.repository.getAll({ page, limit });
  }
}

/** Singleton instance used by the route layer */
export const persistenceTableService = new PersistenceTableService();
