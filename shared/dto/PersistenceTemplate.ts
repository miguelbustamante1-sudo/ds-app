/**
 * DTOs for Persistence Template
 *
 * Shared between the server (repository / service / routes) and the client.
 * These types describe the shape of data flowing through the API — they do NOT
 * depend on Prisma or any server-only module.
 */

// --- Strategy enums (plain string enums — no Prisma / server dependency) ------

export enum ErrorHandlingStrategy {
  STOP_ON_FIRST_ERROR_AND_ROLLBACK = 'STOP_ON_FIRST_ERROR_AND_ROLLBACK',
  STOP_ON_FIRST_ERROR_AND_COMMIT   = 'STOP_ON_FIRST_ERROR_AND_COMMIT',
}

export enum DuplicatesHandlingStrategy {
  INSERT  = 'INSERT',
  REPLACE = 'REPLACE',
}

// --- Column ------------------------------------------------------------------

export interface CreatePersistenceTemplateColumnInput {
  index: number;
  name: string;
  type?: string | null;
  length?: number | null;
  allowNull?: boolean;
  comment?: string | null;
  csvColumnName?: string | null;
  csvColumnIndex?: number;
}

// --- Template -----------------------------------------------------------------

export interface CreatePersistenceTemplateInput {
  name: string;
  description?: string | null;
  targetTable?: string | null;
  enabled?: boolean;
  hasCsvHeader?: boolean;
  separator?: string;
  truncateBeforeImport?: boolean;
  errorHandlingStrategy?: ErrorHandlingStrategy;
  duplicatesHandlingStrategy?: DuplicatesHandlingStrategy;
  createdBy: string;
  columns?: CreatePersistenceTemplateColumnInput[];
}

export interface UpdatePersistenceTemplateInput {
  name: string;
  description?: string | null;
  targetTable?: string | null;
  enabled?: boolean;
  hasCsvHeader?: boolean;
  separator?: string;
  truncateBeforeImport?: boolean;
  errorHandlingStrategy?: ErrorHandlingStrategy;
  duplicatesHandlingStrategy?: DuplicatesHandlingStrategy;
  updatedBy: string;
  columns?: CreatePersistenceTemplateColumnInput[];
}

// --- Response DTOs ------------------------------------------------------------

export interface PersistenceTemplateColumnDTO {
  id: number;
  templateId: number;
  index: number;
  name: string;
  type: string | null;
  length: number | null;
  allowNull: boolean;
  comment: string | null;
  csvColumnName: string | null;
  csvColumnIndex: number;
}

export interface PersistenceTemplateDTO {
  id: number;
  name: string;
  description: string | null;
  targetTable: string | null;
  enabled: boolean;
  hasCsvHeader: boolean;
  separator: string;
  truncateBeforeImport: boolean;
  errorHandlingStrategy: ErrorHandlingStrategy;
  duplicatesHandlingStrategy: DuplicatesHandlingStrategy;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  columns: PersistenceTemplateColumnDTO[];
}
