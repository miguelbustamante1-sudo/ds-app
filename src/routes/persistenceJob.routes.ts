/**
 * Persistence Job - Routes
 *
 * Responsibility: HTTP transport layer only (thin controller).
 * All business logic lives in PersistenceJobService.
 *
 * Security:
 *   GET endpoints use requirePermission('PersistenceTemplates', 'read') — viewing
 *   job records is a read operation and must be accessible to users with read-only
 *   access to this resource.
 *   Mutation endpoints (POST) use requirePermission('PersistenceTemplates', 'create').
 *
 * Endpoints (spec: ticads.yaml):
 *   POST   /persistence-job/            - create a new persistence job
 *   GET    /persistence-job/:id         - get a persistence job by id
 *   POST   /persistence-job/cancel/:id  - cancel a persistence job
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { requirePermission } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { persistenceJobService } from '../services/persistenceJob/PersistenceJobService';
import {
  PersistenceTemplateNotFoundError,
  PersistenceJobInvalidStatusForCancelError,
  PersistenceJobAlreadyCanceledError,
  PersistenceJobConflictError,
} from '../services/persistenceJob/repository';
import { error } from '../logger';

const router = Router();

// --- Multer - memory storage (file accessible as req.file.buffer) -------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'text/tab-separated-values' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      name.endsWith('.csv') ||
      name.endsWith('.tsv') ||
      name.endsWith('.txt')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, TSV, or plain text files are accepted'));
    }
  },
});

// --- GET /persistence-job/ ---------------------------------------------------
// Returns all persistence jobs ordered by most recent first.
router.get(
  '/',
  requirePermission('PersistenceTemplates', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const jobs = await persistenceJobService.getAll();
      res.status(200).json(jobs);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to retrieve persistence jobs' });
    }
  },
);

// --- POST /persistence-job/cancel/:id ----------------------------------------
// NOTE: registered BEFORE /:id so Express does not treat "cancel" as an id.
// Cancels a persistence job that is not yet in a terminal state.
router.post(
  '/cancel/:id',
  requirePermission('PersistenceTemplates', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id ?? '', 10);

      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: 'Invalid job id' });
        return;
      }

      const updatedBy = req.user?.email ?? 'unknown';
      const job = await persistenceJobService.cancel(id, updatedBy);

      if (!job) {
        res.status(404).json({ error: 'Persistence job not found' });
        return;
      }

      res.status(200).json({ id: job.id, status: job.status });
    } catch (err) {
      if (err instanceof PersistenceJobAlreadyCanceledError) {
        res.status(400).json({ error: err.message });
        return;
      }

      if (err instanceof PersistenceJobInvalidStatusForCancelError) {
        res.status(400).json({ error: err.message });
        return;
      }

      error(err);
      res.status(500).json({ error: 'Failed to cancel persistence job' });
    }
  },
);

// --- POST /persistence-job/ ---------------------------------------------------
// Creates a new persistence job.
// Body (multipart/form-data):
//   - file                        (File)    required - CSV file to import
//   - persistenceTemplateId     (Text)    required - positive integer
router.post(
  '/',
  requirePermission('PersistenceTemplates', 'create'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // -- Validate file ------------------------------------------------------
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: '`file` is required' });
        return;
      }

      // -- Validate persistenceTemplateId -----------------------------------
      const rawTemplateId = req.body['persistenceTemplateId'] as unknown;

      if (
        rawTemplateId === undefined ||
        rawTemplateId === null ||
        rawTemplateId === ''
      ) {
        res
          .status(400)
          .json({ error: '`persistenceTemplateId` is required' });
        return;
      }

      const persistenceTemplateId = parseInt(String(rawTemplateId), 10);

      if (isNaN(persistenceTemplateId) || persistenceTemplateId < 1) {
        res.status(400).json({
          error: '`persistenceTemplateId` must be a positive integer',
        });
        return;
      }

      const createdBy = req.user?.email ?? 'unknown';

      // -- Delegate to service ------------------------------------------------
      const job = await persistenceJobService.createJob(
        persistenceTemplateId,
        file.buffer,
        file.originalname,
        createdBy,
      );

      res.status(200).json(job);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === 'Only CSV, TSV, or plain text files are accepted'
      ) {
        res.status(400).json({ error: err.message });
        return;
      }

      if (err instanceof PersistenceTemplateNotFoundError) {
        res.status(400).json({ error: err.message });
        return;
      }

      if (err instanceof PersistenceJobConflictError) {
        res.status(409).json({ error: err.message });
        return;
      }

      error(err);
      res.status(500).json({ error: 'Failed to create persistence job' });
    }
  },
);

// --- GET /persistence-job/:id -------------------------------------------------
// Returns a single persistence job by id, including the linked template.
router.get(
  '/:id',
  requirePermission('PersistenceTemplates', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id ?? '', 10);

      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: 'Invalid job id' });
        return;
      }

      const job = await persistenceJobService.getById(id);

      if (!job) {
        res.status(404).json({ error: 'Persistence job not found' });
        return;
      }

      res.status(200).json(job);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to retrieve persistence job' });
    }
  },
);

export default router;
