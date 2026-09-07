/**
 * Persistence Template - Service (Business Logic Layer)
 *
 * Responsibility: orchestrate business operations on persistence templates.
 * Depends on the repository abstraction so the data source can be swapped
 * without touching this class (Dependency Inversion Principle).
 */

import type {
  PersistenceTemplateRecord,
  PaginationOptions,
} from './repository';
import type {
  CreatePersistenceTemplateInput,
  UpdatePersistenceTemplateInput,
} from '../../../shared/dto/PersistenceTemplate';
import {
  getAllPersistenceTemplates,
  getPersistenceTemplateById,
  updatePersistenceTemplate,
  createPersistenceTemplate,
  deletePersistenceTemplate,
  findPersistenceTemplateByName,
  ErrorHandlingStrategy,
  DEFAULT_ERROR_HANDLING_STRATEGY,
  isValidErrorHandlingStrategy,
  isTargetTableInDatabase,
  isColumnInTable,
  DuplicatesHandlingStrategy,
  DEFAULT_DUPLICATES_HANDLING_STRATEGY,
  isValidDuplicatesHandlingStrategy,
  PersistenceTemplateHasJobsError,
  PersistenceTemplateNameConflictError,
} from './repository';

export {
  ErrorHandlingStrategy,
  DEFAULT_ERROR_HANDLING_STRATEGY,
  isValidErrorHandlingStrategy,
  isTargetTableInDatabase,
  isColumnInTable,
  PersistenceTemplateHasJobsError,
  PersistenceTemplateNameConflictError,
  DuplicatesHandlingStrategy,
  DEFAULT_DUPLICATES_HANDLING_STRATEGY,
  isValidDuplicatesHandlingStrategy,
};

/** Minimal interface the service depends on (DIP) */
export interface IPersistenceTemplateRepository {
  getAll(pagination: PaginationOptions): Promise<PersistenceTemplateRecord[]>;
  getById(id: number): Promise<PersistenceTemplateRecord | null>;
  update(id: number, input: UpdatePersistenceTemplateInput): Promise<PersistenceTemplateRecord | null>;
  create(input: CreatePersistenceTemplateInput): Promise<PersistenceTemplateRecord>;
  delete(id: number): Promise<boolean>;
}

/** Default repository adapter that delegates to the module functions */
const defaultRepository: IPersistenceTemplateRepository = {
  getAll: getAllPersistenceTemplates,
  getById: getPersistenceTemplateById,
  update: updatePersistenceTemplate,
  create: createPersistenceTemplate,
  delete: deletePersistenceTemplate,
};

export class PersistenceTemplateService {
  private readonly repository: IPersistenceTemplateRepository;

  constructor(repository: IPersistenceTemplateRepository = defaultRepository) {
    this.repository = repository;
  }

  /**
   * Retrieves a paginated list of persistence templates.
   * Defaults: page = 1, limit = 10 (max 100) — matching ticads.yaml spec.
   */
  async getAll(pagination?: Partial<PaginationOptions>): Promise<PersistenceTemplateRecord[]> {
    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 10));
    return this.repository.getAll({ page, limit });
  }

  /** Returns a single persistence template by id, or null if not found. */
  async getById(id: number): Promise<PersistenceTemplateRecord | null> {
    return this.repository.getById(id);
  }

  /**
   * Updates an existing persistence template and replaces its columns.
   * Returns null if not found.
   * @throws {PersistenceTemplateNameConflictError} when another template already uses the same name.
   */
  async update(id: number, input: UpdatePersistenceTemplateInput): Promise<PersistenceTemplateRecord | null> {
    const conflict = await findPersistenceTemplateByName(input.name, id);
    if (conflict !== null) {
      throw new PersistenceTemplateNameConflictError(input.name);
    }
    return this.repository.update(id, input);
  }

  /**
   * Creates a new persistence template with its columns.
   * @throws {PersistenceTemplateNameConflictError} when another template already uses the same name.
   */
  async create(input: CreatePersistenceTemplateInput): Promise<PersistenceTemplateRecord> {
    const conflict = await findPersistenceTemplateByName(input.name);
    if (conflict !== null) {
      throw new PersistenceTemplateNameConflictError(input.name);
    }
    return this.repository.create(input);
  }

  /**
   * Deletes a persistence template and all its columns.
   * Returns true when deleted, false when the template was not found.
   */
  async delete(id: number): Promise<boolean> {
    return this.repository.delete(id);
  }
}

/** Singleton instance used by the route layer */
export const persistenceTemplateService = new PersistenceTemplateService();
