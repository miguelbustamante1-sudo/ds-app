/**
 * DTOs for Persistence Job
 *
 * Shared between the server (repository / service / routes) and the client.
 * These types describe the shape of data flowing through the API — they do NOT
 * depend on Prisma or any server-only module.
 */

// --- Status enum --------------------------------------------------------------

export enum PersistenceJobStatus {
  NEW        = 'NEW',
  WAITING    = 'WAITING',
  RUNNING    = 'RUNNING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED     = 'FAILED',
  CANCELED   = 'CANCELED',
}

// --- Request DTOs -------------------------------------------------------------

export interface CreatePersistenceJobInput {
  /** ID of the persistence template that describes the target table / columns. */
  persistenceTemplateId: number;
  /** Original file name of the uploaded CSV. */
  fileInputName: string;
  /** Storage path where the CSV is persisted server-side. */
  fileStoragePath: string;
  /** Number of data rows in the CSV (excluding header). */
  fileLinesCount: number;
  /** Email / identifier of the authenticated user creating the job. */
  createdBy: string;
}

// --- Response DTOs ------------------------------------------------------------

/**
 * Shape of a Persistence Job as returned by the API (camelCase, Prisma-serialized).
 * Used by both the server route layer and the frontend client.
 */
export interface PersistenceJobRecord {
  id:                    number;
  status:                string;
  fileInputName:         string;
  fileStoragePath:       string;
  fileLinesCount:        number;
  fileLinesInserted:     number;
  fileErrorLine:         number;
  fileErrorMessage:      string | null;
  persistenceTemplateId: number;
  createdBy:             string;
  createdAt:             string;
  updatedBy:             string | null;
  updatedAt:             string | null;
  /** Linked persistence template (name + id, always included). */
  template: {
    id:   number;
    name: string;
  };
}

/** Minimal response returned by the cancel endpoint. */
export interface PersistenceJobCancelDTO {
  id:     number;
  status: PersistenceJobStatus;
}
