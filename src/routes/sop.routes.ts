import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import { authMiddleware, requirePermission } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { ingestDocument, removeDocument } from '../services/sop/SopSyncOrchestrator';
import { startQuestion, checkAnswer } from '../services/sop/SopQueryOrchestrator';
import { listVectorStoreFiles } from '../services/sop/FuelixCopilotClient';
import { isSupportedMimeType } from '../services/sop/DocumentParser';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';

const router = Router();

const sopUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!isSupportedMimeType(file.mimetype)) {
      return cb(new AppError('Unsupported file type. Accepted: .txt, .md, .pdf, .docx', 400));
    }
    cb(null, true);
  },
});

// POST /api/sop/upload
router.post(
  '/upload',
  authMiddleware,
  requirePermission('SopKnowledge', 'create'),
  sopUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) throw new AppError('No file provided', 400);
      const result = await ingestDocument(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      await auditOrchestrator.log({
        entityName: 'fuelix_vector_store_file',
        entityId:   result.docId,
        createdBy:  req.user!.email,
        oldValues:  null,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `SOP document ingested: ${req.file.originalname}`,
      });
      return res.status(201).json({ data: result });
    } catch (err: unknown) {
      if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/sop/documents/:docId  (docId is URL-encoded — Fuel iX file IDs may contain characters that need it)
router.delete(
  '/documents/:docId',
  authMiddleware,
  requirePermission('SopKnowledge', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawDocId = req.params['docId'];
      if (!rawDocId) throw new AppError('docId is required', 400);
      const docId = decodeURIComponent(rawDocId);
      await removeDocument(docId);
      await auditOrchestrator.log({
        entityName: 'fuelix_vector_store_file',
        entityId:   docId,
        createdBy:  req.user!.email,
        oldValues:  { docId } as unknown as Record<string, unknown>,
        newValues:  null,
        comment:    `SOP document removed: ${docId}`,
      });
      return res.status(204).send();
    } catch (err: unknown) {
      if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/sop/documents
router.get(
  '/documents',
  authMiddleware,
  requirePermission('SopKnowledge', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const docs = await listVectorStoreFiles();
      return res.json({ data: docs });
    } catch (err: unknown) {
      if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/sop/ask — starts a run and returns immediately, does not wait for
// Fuel iX. continuationToken (if provided) is a signed, user-bound token —
// never a raw Fuel iX threadId (see SopAskToken.ts).
router.post(
  '/ask',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dsUserId = req.user?.dsUserId;
      if (!dsUserId) throw new AppError('Unauthenticated', 401);

      const { question, continuationToken } = req.body as {
        question: unknown;
        continuationToken?: unknown;
      };
      if (!question || typeof question !== 'string') {
        throw new AppError('question is required and must be a string', 400);
      }
      if (continuationToken !== undefined && typeof continuationToken !== 'string') {
        throw new AppError('continuationToken must be a string', 400);
      }
      const result = await startQuestion(question.trim(), dsUserId, continuationToken);
      return res.json({ data: result });
    } catch (err: unknown) {
      if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/sop/ask/:pollToken — one non-blocking status check. The frontend
// polls this on an interval; each call is a fast round trip. pollToken is a
// signed, user-bound token — never a raw Fuel iX threadId/runId pair.
router.get(
  '/ask/:pollToken',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dsUserId = req.user?.dsUserId;
      if (!dsUserId) throw new AppError('Unauthenticated', 401);

      const pollToken = req.params['pollToken'];
      if (!pollToken) throw new AppError('pollToken is required', 400);

      const result = await checkAnswer(pollToken, dsUserId);
      return res.json({ data: result });
    } catch (err: unknown) {
      if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
