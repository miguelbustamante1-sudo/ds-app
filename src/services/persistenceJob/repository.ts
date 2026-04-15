/**
 * Persistence Job - Repository (Data Access Layer)
 *
 * Responsibility: raw data access for persistence jobs.
 * Uses Prisma for all DB operations.
 */

import { prisma } from '../../db/prisma';
import {
  PersistenceJobStatus,
} from '../../../shared/dto/PersistenceJob';
import type {
  CreatePersistenceJobInput,
} from '../../../shared/dto/PersistenceJob';

export type { CreatePersistenceJobInput, PersistenceJobStatus };

// --- Record type (DB row shape returned to the service layer) -----------------

export interface PersistenceJobRecord {
  id:                    number;
  status:                PersistenceJobStatus;
  fileInputName:         string;
  fileStoragePath:       string;
  fileLinesCount:        number;
  fileLinesInserted:     number;
  fileErrorLine:         number;
  fileErrorMessage:      string | null;
  persistenceTemplateId: number;
  createdBy:             string;
  createdAt:             Date;
  updatedBy:             string | null;
  updatedAt:             Date | null;
  template: {
    id:                         number;
    name:                       string;
    description:                string | null;
    enabled:                    boolean;
    errorHandlingStrategy:      string;
    duplicatesHandlingStrategy: string;
    targetTable:                string | null;
    createdBy:                  string;
    createdAt:                  Date;
    updatedBy:                  string | null;
    updatedAt:                  Date | null;
    columns: Array<{
      id:        number;
      index:     number;
      name:      string;
      type:      string | null;
      length:    number | null;
      allowNull: boolean;
      comment:   string | null;
    }>;
  };
}

// --- Domain errors ------------------------------------------------------------

/** Thrown when the referenced persistence template does not exist. */
export class PersistenceTemplateNotFoundError extends Error {
  constructor(id: number) {
    super(`Persistence template with id ${id} not found`);
    this.name = 'PersistenceTemplateNotFoundError';
  }
}

/** Thrown when a job cannot be canceled because its status is not WAITING or RUNNING. */
export class PersistenceJobInvalidStatusForCancelError extends Error {
  constructor() {
    super('Persistence Job has a not valid Status for canceling operation');
    this.name = 'PersistenceJobInvalidStatusForCancelError';
  }
}

/** Thrown when a cancel is attempted on a job that is already CANCELED. */
export class PersistenceJobAlreadyCanceledError extends Error {
  constructor() {
    super('Persistence Job is already canceled');
    this.name = 'PersistenceJobAlreadyCanceledError';
  }
}

/**
 * Thrown when a new job is submitted for a target table that already has an
 * active job (status WAITING or RUNNING).
 */
export class PersistenceJobConflictError extends Error {
  constructor(targetTable: string) {
    super(
      `A job for target table "${targetTable}" is already active (WAITING or RUNNING). ` +
      `Please wait for it to finish or cancel it before submitting a new one.`,
    );
    this.name = 'PersistenceJobConflictError';
  }
}

// --- Helpers ------------------------------------------------------------------

/** Count non-empty lines in a CSV buffer (excluding header). */
export function countCsvLines(buffer: Buffer): number {
  const text  = buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // Subtract 1 to exclude the header row (min 0)
  return Math.max(0, lines.length - 1);
}

// --- Repository functions -----------------------------------------------------

const include = {
  template: {
    include: { columns: { orderBy: { index: 'asc' as const } } },
  },
} as const;

/** Inserts a new persistence job record with status NEW. */
export async function createPersistenceJob(
  input: CreatePersistenceJobInput,
): Promise<PersistenceJobRecord> {
  // Validate that the template exists before attempting insertion so callers
  // receive a meaningful 400 instead of a FK-constraint 500.
  const template = await prisma.persistenceTemplate.findUnique({
    where: { id: input.persistenceTemplateId },
    select: { id: true },
  });

  if (!template) {
    throw new PersistenceTemplateNotFoundError(input.persistenceTemplateId);
  }

  return prisma.persistenceJob.create({
    data: {
      status:                PersistenceJobStatus.NEW,
      fileInputName:         input.fileInputName,
      fileStoragePath:       input.fileStoragePath,
      fileLinesCount:        input.fileLinesCount,
      fileLinesInserted:     0,
      fileErrorLine:         0,
      persistenceTemplateId: input.persistenceTemplateId,
      createdBy:             input.createdBy,
    },
    include,
  }) as unknown as PersistenceJobRecord;
}

/** Returns all persistence jobs ordered by most recent first. */
export async function getAllPersistenceJobs(): Promise<PersistenceJobRecord[]> {
  return prisma.persistenceJob.findMany({
    orderBy: { createdAt: 'desc' },
    include,
  }) as unknown as PersistenceJobRecord[];
}

/** Returns a single persistence job by id, or null if not found. */
export async function getPersistenceJobById(
  id: number,
): Promise<PersistenceJobRecord | null> {
  return prisma.persistenceJob.findUnique({ where: { id }, include }) as unknown as PersistenceJobRecord | null;
}

/**
 * Returns true when there is at least one persistence job in WAITING or RUNNING
 * status whose template points to the given target table.
 * Used to prevent duplicate concurrent jobs for the same table.
 */
export async function hasActiveJobForTable(targetTable: string): Promise<boolean> {
  const count = await prisma.persistenceJob.count({
    where: {
      status: { in: [PersistenceJobStatus.WAITING, PersistenceJobStatus.RUNNING] },
      template: { targetTable },
    },
  });
  return count > 0;
}

/**
 * Lightweight check: returns true when the job's current DB status is CANCELED.
 * Used by the insert loop to self-cancel without an in-process signal.
 */
export async function isJobCanceled(id: number): Promise<boolean> {
  const row = await prisma.persistenceJob.findUnique({
    where:  { id },
    select: { status: true },
  });
  return row?.status === PersistenceJobStatus.CANCELED;
}

/** Updates a job's status and related counters/error fields. */
export async function updatePersistenceJobStatus(
  id: number,
  updates: {
    status:             PersistenceJobStatus;
    fileLinesInserted?: number;
    fileErrorLine?:     number;
    fileErrorMessage?:  string | null;
    updatedBy?:         string;
  },
): Promise<void> {
  // Build the data object without spreading undefined values — the project uses
  // exactOptionalPropertyTypes which forbids passing `undefined` for numeric fields.
  const data: Record<string, unknown> = {
    status:    updates.status,
    updatedBy: updates.updatedBy ?? null,
    updatedAt: new Date(),
  };

  if (updates.fileLinesInserted !== undefined) {
    data['fileLinesInserted'] = updates.fileLinesInserted;
  }
  if (updates.fileErrorLine !== undefined) {
    data['fileErrorLine'] = updates.fileErrorLine;
  }
  if ('fileErrorMessage' in updates) {
    data['fileErrorMessage'] = updates.fileErrorMessage ?? null;
  }

  await prisma.persistenceJob.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data:  data as any,
  });
}

/**
 * Sets a job's status to CANCELED.
 * Only jobs with status WAITING or RUNNING can be canceled.
 *
 * @returns the updated record, or null if the job was not found.
 * @throws {PersistenceJobAlreadyCanceledError} when the job is already CANCELED.
 * @throws {PersistenceJobInvalidStatusForCancelError} when the job exists but
 *         its status is not WAITING or RUNNING (and is not already CANCELED).
 */
export async function cancelPersistenceJob(
  id: number,
  updatedBy: string,
): Promise<PersistenceJobRecord | null> {
  const job = await prisma.persistenceJob.findUnique({ where: { id } });

  if (!job) return null;

  const status = job.status as PersistenceJobStatus;

  if (status === PersistenceJobStatus.CANCELED) {
    throw new PersistenceJobAlreadyCanceledError();
  }

  const cancelable: PersistenceJobStatus[] = [
    PersistenceJobStatus.WAITING,
    PersistenceJobStatus.RUNNING,
  ];

  if (!cancelable.includes(status)) {
    throw new PersistenceJobInvalidStatusForCancelError();
  }

  return prisma.persistenceJob.update({
    where: { id },
    data:  { status: PersistenceJobStatus.CANCELED, updatedBy, updatedAt: new Date() },
    include,
  }) as unknown as PersistenceJobRecord;
}
