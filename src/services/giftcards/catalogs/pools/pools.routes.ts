import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { getPools, getPoolById } from './GetPools';
import { createPool, validateCreatePool, ValidationError } from './CreatePool';
import { updatePool, validateUpdatePool } from './UpdatePool';
import { deactivatePool } from './DeactivatePool';
import { auditOrchestrator } from '../../../audit/AuditOrchestrator';
import { error } from '../../../../logger';

const router = Router();

// GET /api/giftcards/catalogs/pools
router.get(
  '/',
  requirePermission('GiftCardCatalog', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await getPools();
      res.json({ data: result });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch pools' });
    }
  },
);

// POST /api/giftcards/catalogs/pools
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

      const input  = validateCreatePool((req as Request).body as Record<string, unknown>, dsUserId);
      const result = await createPool(input);

      await auditOrchestrator.log({
        entityName: 'tbl_gcp_pools',
        entityId:   String(result.poolId),
        createdBy:  req.user!.email,
        oldValues:  null,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Pool "${result.poolName}" created`,
      });

      res.status(201).json({ data: result });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to create pool' });
    }
  },
);

// PUT /api/giftcards/catalogs/pools/:id
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

      const oldRecord = await getPoolById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Pool ${id} not found` });
        return;
      }

      const input  = validateUpdatePool((req as Request).body as Record<string, unknown>);
      const result = await updatePool(id, input);
      if (!result) {
        res.status(404).json({ error: `Pool ${id} not found` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'tbl_gcp_pools',
        entityId:   String(id),
        createdBy:  req.user!.email,
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Pool "${result.poolName}" updated`,
      });

      res.json({ data: result });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to update pool' });
    }
  },
);

// DELETE /api/giftcards/catalogs/pools/:id
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

      const oldRecord = await getPoolById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Pool ${id} not found` });
        return;
      }

      const deactivated = await deactivatePool(id);
      if (!deactivated) {
        res.status(404).json({ error: `Pool ${id} not found` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'tbl_gcp_pools',
        entityId:   String(id),
        createdBy:  req.user!.email,
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  { ...oldRecord, poolIsActive: false } as unknown as Record<string, unknown>,
        comment:    `Pool "${oldRecord.poolName}" deactivated`,
      });

      res.status(204).send();
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to deactivate pool' });
    }
  },
);

export default router;