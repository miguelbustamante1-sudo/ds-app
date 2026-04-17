/**
 * Persistence Job - Service (Business Logic Layer)
 *
 * Responsibility: orchestrate business operations on persistence jobs.
 * Depends on repository abstractions - never on concrete implementations
 * (Dependency Inversion Principle).
 *
 * Cancellation strategy: the cancel() method only updates the job's DB status
 * to CANCELED. The running insert loop polls the DB every N rows via the
 * checkCancel callback (injected at createJob() time) and self-terminates
 * when it detects the CANCELED status - no in-process signal is needed.
 */

import { prisma } from '../../db/prisma';
import type { CreatePersistenceJobInput } from '../../../shared/dto/PersistenceJob';
import { PersistenceJobStatus } from '../../../shared/dto/PersistenceJob';
import type { PersistenceJobRecord } from './repository';
import {
  createPersistenceJob,
  getAllPersistenceJobs,
  getPersistenceJobById,
  cancelPersistenceJob,
  countCsvLines,
  updatePersistenceJobStatus,
  isJobCanceled,
  hasActiveJobForTable,
  PersistenceJobConflictError,
} from './repository';
import { csvValidationService } from './CsvValidationService';
import { csvInsertService } from './CsvInsertService';
import { persistenceDataTypeService } from '../persistenceDataType/PersistenceDataTypeService';

// --- Repository interface (DIP / ISP) ----------------------------------------

export interface IPersistenceJobRepository {
  create(input: CreatePersistenceJobInput): Promise<PersistenceJobRecord>;
  getById(id: number): Promise<PersistenceJobRecord | null>;
  cancel(id: number, updatedBy: string): Promise<PersistenceJobRecord | null>;
}

// --- Default adapter ----------------------------------------------------------

const defaultRepository: IPersistenceJobRepository = {
  create:  createPersistenceJob,
  getById: getPersistenceJobById,
  cancel:  cancelPersistenceJob,
};

// --- Service ------------------------------------------------------------------

export class PersistenceJobService {
  private readonly repository: IPersistenceJobRepository;

  constructor(repository: IPersistenceJobRepository = defaultRepository) {
    this.repository = repository;
  }

  /**
   * Creates a new persistence job and fires the validate->insert pipeline
   * asynchronously via setImmediate.
   *
   * Cancellation is DB-driven: cancel() marks the job CANCELED in the DB, and
   * the insert loop's checkCancel callback detects it every N rows.
   */
  async createJob(
    persistenceTemplateId: number,
    csvBuffer: Buffer,
    originalFileName: string,
    createdBy: string,
  ): Promise<PersistenceJobRecord> {
    // -- Conflict guard: reject if another job is already active for the same
    //    target table. We resolve the template's targetTable from the DB first
    //    so we can check before even creating the job record.
    const templateRow = await prisma.persistenceTemplate.findUnique({
      where:  { id: persistenceTemplateId },
      select: { targetTable: true, hasCsvHeader: true },
    });

    if (templateRow?.targetTable) {
      const conflict = await hasActiveJobForTable(templateRow.targetTable);
      if (conflict) {
        throw new PersistenceJobConflictError(templateRow.targetTable);
      }
    }

    const fileLinesCount  = countCsvLines(csvBuffer, templateRow?.hasCsvHeader ?? true);
    const fileStoragePath = `job-${Date.now()}-${originalFileName}`;

    const job = await this.repository.create({
      persistenceTemplateId,
      fileInputName:  originalFileName,
      fileStoragePath,
      fileLinesCount,
      createdBy,
    });

    const jobId   = job.id;
    const template = job.template;
    const prefix   = `[PersistenceJob][job=${jobId}]`;

    // Callback injected into the insert loop so it can self-cancel by polling
    // the DB status - decoupled from any in-process signal.
    const checkCancel = (): Promise<boolean> => isJobCanceled(jobId);

    setImmediate(async () => {
      try {
        // 1. Fetch data types for CSV type-validation
        const dataTypes = await persistenceDataTypeService.getAll({ page: 1, limit: 100 });

        // 2. Validate CSV content against template columns
        const stopOnFirstError =
          template.errorHandlingStrategy === 'STOP_ON_FIRST_ERROR_AND_ROLLBACK' ||
          template.errorHandlingStrategy === 'STOP_ON_FIRST_ERROR_AND_COMMIT';

        console.log(
          `${prefix} errorHandlingStrategy="${template.errorHandlingStrategy}" stopOnFirstError=${stopOnFirstError}`,
        );

        const validationResult = csvValidationService.validate(
          csvBuffer,
          template.columns,
          dataTypes,
          jobId,
          stopOnFirstError,
          template.hasCsvHeader,
        );

        if (!validationResult.valid) {
          const firstHeaderErr = validationResult.headerErrors[0];
          const firstCellErr   = validationResult.cellErrors[0];
          const errorMessage   = firstHeaderErr
            ?? (firstCellErr ? firstCellErr.message : 'CSV validation failed');
          const errorLine      = firstCellErr ? firstCellErr.row : 0;

          await updatePersistenceJobStatus(jobId, {
            status:           PersistenceJobStatus.FAILED,
            fileErrorLine:    errorLine,
            fileErrorMessage: errorMessage,
            updatedBy:        createdBy,
          });
          return;
        }

        // 3. Guard: template must have a target table
        if (!template.targetTable) {
          await updatePersistenceJobStatus(jobId, {
            status:           PersistenceJobStatus.FAILED,
            fileErrorMessage: 'Template has no target table configured',
            updatedBy:        createdBy,
          });
          return;
        }

        // 4. Mark job as RUNNING
        await updatePersistenceJobStatus(jobId, {
          status:    PersistenceJobStatus.RUNNING,
          updatedBy: createdBy,
        });

        // 5. Insert rows; pass checkCancel so the loop can self-terminate
        const insertResult = await csvInsertService.insert({
          targetTable:                template.targetTable,
          columns:                    template.columns,
          csvBuffer,
          hasCsvHeader:               template.hasCsvHeader,
          validationResult,
          errorHandlingStrategy:      template.errorHandlingStrategy,
          duplicatesHandlingStrategy: template.duplicatesHandlingStrategy,
          jobId,
          checkCancel,
        });

        // 6. Check if the job was canceled mid-insert
        const wasCanceled = await isJobCanceled(jobId);
        if (wasCanceled) {
          console.warn(`${prefix} Job was canceled during insert - ${insertResult.linesInserted} row(s) inserted before stop`);
          await updatePersistenceJobStatus(jobId, {
            status:            PersistenceJobStatus.CANCELED,
            fileLinesInserted: insertResult.linesInserted,
            updatedBy:         createdBy,
          }).catch(() => {/* best-effort */});
          return;
        }

        // 7. Normal completion
        const finalStatus = insertResult.errorLine === 0
          ? PersistenceJobStatus.SUCCESSFUL
          : PersistenceJobStatus.FAILED;

        await updatePersistenceJobStatus(jobId, {
          status:            finalStatus,
          fileLinesInserted: insertResult.linesInserted,
          fileErrorLine:     insertResult.errorLine,
          fileErrorMessage:  insertResult.errorMessage,
          updatedBy:         createdBy,
        });

        console.log(`${prefix} Completed with status ${finalStatus}`);

      } catch (err) {
        console.error(`${prefix} Unexpected error:`, err);
        const msg = err instanceof Error ? err.message : String(err);
        await updatePersistenceJobStatus(jobId, {
          status:           PersistenceJobStatus.FAILED,
          fileErrorMessage: msg,
          updatedBy:        createdBy,
        }).catch(() => {/* best-effort */});
      }
    });

    return job;
  }

  /** Returns all persistence jobs ordered by most recent first. */
  async getAll(): Promise<PersistenceJobRecord[]> {
    return getAllPersistenceJobs();
  }

  /**
   * Returns a single persistence job by id.
   * Returns null when not found.
   */
  async getById(id: number): Promise<PersistenceJobRecord | null> {
    return this.repository.getById(id);
  }

  /**
   * Cancels a persistence job by updating its DB status to CANCELED.
   *
   * The running insert loop polls the DB via checkCancel every N rows and
   * self-terminates when it detects the CANCELED status.
   *
   * Returns the updated record, or null when the job does not exist or is
   * already in a terminal state (SUCCESSFUL, FAILED, CANCELED).
   */
  async cancel(
    id: number,
    updatedBy: string,
  ): Promise<PersistenceJobRecord | null> {
    return this.repository.cancel(id, updatedBy);
  }
}

/** Singleton instance used by the route layer. */
export const persistenceJobService = new PersistenceJobService();
