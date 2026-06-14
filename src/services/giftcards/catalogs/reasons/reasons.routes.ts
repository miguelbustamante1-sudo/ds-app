import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { getReasons, getReasonById } from './GetReasons';
import { createReason, validateCreateReason, ValidationError } from './CreateReason';
import { updateReason, validateUpdateReason } from './UpdateReason';
import { deactivateReason } from './DeactivateReason';
import { auditOrchestrator } from '../../../audit/AuditOrchestrator';
import { error } from '../../../../logger';

const router = Router();

// GET /api/giftcards/catalogs/reasons
router.get(
  '/',
  requirePermission('GiftCardCatalog', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await getReasons();
      res.json({ data: result });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch reasons' });
    }
  },
);

// POST /api/giftcards/catalogs/reasons
router.post(
  '/',
  requirePermission('GiftCardCatalog', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dsUserId = req.user?.dsUserId;
      if (!dsUserId) {
        res.status(401).json({ error: 'Authenticated user not found in directory' });
        return;
      }

      const input  = validateCreateReason((req as Request).body as Record<string, unknown>, dsUserId);
      const result = await createReason(input);

      await auditOrchestrator.log({
        entityName: 'tbl_gcr_reasons',
        entityId:   String(result.reasonId),
        createdBy:  req.user!.email,
        oldValues:  null,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Reason "${result.reasonName}" created`,
      });

      res.status(201).json({ data: result });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to create reason' });
    }
  },
);

// PUT /api/giftcards/catalogs/reasons/:id
router.put(
  '/:id',
  requirePermission('GiftCardCatalog', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const oldRecord = await getReasonById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Reason ${id} not found` });
        return;
      }

      const input  = validateUpdateReason((req as Request).body as Record<string, unknown>);
      const result = await updateReason(id, input);
      if (!result) {
        res.status(404).json({ error: `Reason ${id} not found` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'tbl_gcr_reasons',
        entityId:   String(id),
        createdBy:  req.user!.email,
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Reason "${result.reasonName}" updated`,
      });

      res.json({ data: result });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to update reason' });
    }
  },
);

// DELETE /api/giftcards/catalogs/reasons/:id
router.delete(
  '/:id',
  requirePermission('GiftCardCatalog', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const oldRecord = await getReasonById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Reason ${id} not found` });
        return;
      }

      const deactivated = await deactivateReason(id);
      if (!deactivated) {
        res.status(404).json({ error: `Reason ${id} not found` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'tbl_gcr_reasons',
        entityId:   String(id),
        createdBy:  req.user!.email,
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  { ...oldRecord, reasonIsActive: false } as unknown as Record<string, unknown>,
        comment:    `Reason "${oldRecord.reasonName}" deactivated`,
      });

      res.status(204).send();
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to deactivate reason' });
    }
  },
);

export default router;