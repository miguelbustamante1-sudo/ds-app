import { Router, Request, Response, NextFunction } from 'express';
import { requirePermission } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { shiftOrchestrator } from '../services/shift/ShiftOrchestrator';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import { ValidationError } from '../services/shift/components/ValidateShiftInput';
import { error } from '../logger';

const router = Router();

// GET /shift/
router.get(
  '/',
  requirePermission('Shift', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await shiftOrchestrator.getAll();
      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch shifts' });
    }
  },
);

// GET /shift/:id
router.get(
  '/:id',
  requirePermission('Shift', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }
      const result = await shiftOrchestrator.getById(id);
      if (!result) {
        res.status(404).json({ error: `Shift ${id} not found` });
        return;
      }
      res.json(result);
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch shift' });
    }
  },
);

// POST /shift/
router.post(
  '/',
  requirePermission('Shift', 'create'),
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    try {
      const createdBy = req.user!.email;
      const result    = await shiftOrchestrator.create((req as Request).body as Record<string, unknown>);

      await auditOrchestrator.log({
        entityName: 'sft_shifts',
        entityId:   String(result.shiftId),
        createdBy,
        oldValues:  null,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Shift "${result.description}" created`,
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to create shift' });
    }
  },
);

// PATCH /shift/:id
router.patch(
  '/:id',
  requirePermission('Shift', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user!.email;
      const id        = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const oldRecord = await shiftOrchestrator.getById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Shift ${id} not found` });
        return;
      }

      const result = await shiftOrchestrator.update(id, (req as Request).body as Record<string, unknown>);
      if (!result) {
        res.status(404).json({ error: `Shift ${id} not found` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'sft_shifts',
        entityId:   String(id),
        createdBy,
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Shift "${result.description}" updated`,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to update shift' });
    }
  },
);

// PATCH /shift/:id/detail/:detailId
router.patch(
  '/:id/detail/:detailId',
  requirePermission('Shift', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user!.email;
      const id        = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }
      const detailId = parseInt(String((req as Request).params['detailId']), 10);
      if (isNaN(detailId) || detailId < 1) {
        res.status(400).json({ error: '`detailId` must be a positive integer' });
        return;
      }

      const parentShift = await shiftOrchestrator.getById(id);
      if (!parentShift) {
        res.status(404).json({ error: `Shift ${id} not found` });
        return;
      }
      const oldDetail = parentShift.details.find((d) => d.shiftDetailId === detailId) ?? null;

      const result = await shiftOrchestrator.updateDetail(id, detailId, (req as Request).body as Record<string, unknown>);
      if (!result) {
        res.status(404).json({ error: `Shift detail ${detailId} not found for shift ${id}` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'sfd_shift_details',
        entityId:   String(detailId),
        createdBy,
        oldValues:  oldDetail as unknown as Record<string, unknown>,
        newValues:  result as unknown as Record<string, unknown>,
        comment:    `Shift detail ${detailId} (shift ${id}) updated`,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to update shift detail' });
    }
  },
);

// DELETE /shift/:id
router.delete(
  '/:id',
  requirePermission('Shift', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user!.email;
      const id        = parseInt(String((req as Request).params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: '`id` must be a positive integer' });
        return;
      }

      const oldRecord = await shiftOrchestrator.getById(id);
      if (!oldRecord) {
        res.status(404).json({ error: `Shift ${id} not found` });
        return;
      }

      const deleted = await shiftOrchestrator.delete(id);
      if (!deleted) {
        res.status(404).json({ error: `Shift ${id} not found` });
        return;
      }

      await auditOrchestrator.log({
        entityName: 'sft_shifts',
        entityId:   String(id),
        createdBy,
        oldValues:  oldRecord as unknown as Record<string, unknown>,
        newValues:  null,
        comment:    `Shift "${oldRecord.description}" deleted`,
      });

      res.status(204).send();
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to delete shift' });
    }
  },
);

export default router;
