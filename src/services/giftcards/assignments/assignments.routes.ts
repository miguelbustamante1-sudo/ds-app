import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { getAssignments } from './GetAssignments';
import { createAssignment, validateCreateAssignment } from './CreateAssignment';
import { GiftCardValidationError } from '../errors';
import { error } from '../../../logger';

const router = Router();

// GET /api/giftcards/assignments
router.get('/', requirePermission('GiftCardCatalog', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await getAssignments();
      res.json({ data });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }
);

// POST /api/giftcards/assignments
router.post('/', requirePermission('GiftCardCatalog', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    const dsUserId = req.user?.dsUserId;
    if (!dsUserId) {
      res.status(401).json({ error: 'Authenticated user not found in directory' });
      return;
    }
    try {
      const input = validateCreateAssignment(req.body, dsUserId);
      const result = await createAssignment(input);
      await auditOrchestrator.log({
        entityName: 'tbl_gca_card_assignments',
        entityId:   String(result.assignmentId),
        createdBy:  req.user!.email, // requirePermission guarantees req.user is set at this point
        oldValues:  null,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Gift card assignment created`,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      if (err instanceof GiftCardValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  }
);

export default router;