import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { getDocumentations, getDocumentationsByAssignment } from './GetDocumentation';
import { createDocumentation, validateCreateDocumentation } from './CreateDocumentation';
import { GiftCardValidationError } from '../errors';
import { error } from '../../../logger';
import { AppError } from '../../../errors/AppError';

const router = Router();

// GET /api/giftcards/documentation
router.get('/', requirePermission('GiftCardDocumentation', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await getDocumentations();
      res.json({ data });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch documentation records' });
    }
  }
);

// GET /api/giftcards/documentation/assignment/:assignmentId
router.get('/assignment/:assignmentId', requirePermission('GiftCardDocumentation', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const assignmentId = parseInt(req.params['assignmentId'] ?? '', 10);
      if (isNaN(assignmentId)) throw new AppError('Invalid assignment ID', 400);
      const data = await getDocumentationsByAssignment(assignmentId);
      res.json({ data });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to fetch documentation records' });
    }
  }
);

// POST /api/giftcards/documentation
router.post('/', requirePermission('GiftCardDocumentation', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dsUserId = req.user?.dsUserId;
      if (!dsUserId) {
        throw new AppError('Authenticated user not found in directory', 401);
      }
      const input = validateCreateDocumentation(req.body, dsUserId);
      const result = await createDocumentation(input);
      await auditOrchestrator.log({
        entityName: 'tbl_gcd_card_documentation',
        entityId:   String(result.documentationId),
        createdBy:  req.user!.email,
        oldValues:  null,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Gift card documentation created for assignment ${result.assignmentId}`,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      if (err instanceof GiftCardValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to create documentation record' });
    }
  }
);

export default router;
