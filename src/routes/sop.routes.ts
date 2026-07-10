import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import { authMiddleware, requirePermission } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { ingestDocument, removeDocument } from '../services/sop/SopSyncOrchestrator';
import { answerQuestion } from '../services/sop/SopQueryOrchestrator';
import { listDocuments } from '../services/sop/SopRepository';
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
        entityName: 'dch_doc_chunks',
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

// DELETE /api/sop/documents/:docId  (docId is URL-encoded — GCS keys contain slashes)
router.delete(
  '/documents/:docId',
  authMiddleware,
  requirePermission('SopKnowledge', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawDocId = req.params['docId'];
      if (!rawDocId) throw new AppError('docId is required', 400);
      const docId = decodeURIComponent(rawDocId);
      await auditOrchestrator.log({
        entityName: 'dch_doc_chunks',
        entityId:   docId,
        createdBy:  req.user!.email,
        oldValues:  { docId } as unknown as Record<string, unknown>,
        newValues:  null,
        comment:    `SOP document removed: ${docId}`,
      });
      await removeDocument(docId);
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
      const docs = await listDocuments();
      return res.json({ data: docs });
    } catch (err: unknown) {
      if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/sop/ask
router.post(
  '/ask',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { question } = req.body as { question: unknown };
      if (!question || typeof question !== 'string') {
        throw new AppError('question is required and must be a string', 400);
      }
      const result = await answerQuestion(question.trim());
      return res.json({ data: result });
    } catch (err: unknown) {
      if (err instanceof AppError) return res.status(err.statusCode).json({ error: err.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
