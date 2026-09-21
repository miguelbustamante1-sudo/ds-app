import express from 'express';
import type { Response } from 'express';
import type { TimeOffStatus } from '@prisma/client';
import type { CreateTimeOffStatusDTO, UpdateTimeOffStatusDTO } from '@shared/dto';
import {
  getAllStatuses,
  getStatusById,
  getStatusByName,
  createStatus,
  updateStatus,
  deleteStatus,
} from '../db/timeOffStatuses';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';

const router = express.Router();

// GET /time-off-statuses
router.get('/', requirePermission('TimeOffStatuses', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statuses: TimeOffStatus[] = await getAllStatuses();
    res.json(statuses);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// GET /time-off-statuses/by-name/:name
router.get('/by-name/:name', requirePermission('TimeOffStatuses', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.params;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid status name' });
    }

    const status = await getStatusByName(name);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json(status);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// GET /time-off-statuses/:id
router.get('/:id', requirePermission('TimeOffStatuses', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const status = await getStatusById(id);
    if (!status) return res.status(404).json({ error: 'Status not found' });

    res.json(status);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST /time-off-statuses
router.post('/', requirePermission('TimeOffStatuses', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdBy = req.user?.email ?? 'unknown';
    const { statusName, statusShortName } = req.body as CreateTimeOffStatusDTO;

    if (!statusName || typeof statusName !== 'string') {
      return res.status(400).json({ error: 'statusName is required' });
    }

    const created = await createStatus(statusName.trim(), statusShortName?.trim() || undefined);

    await auditOrchestrator.log({
      entityName: 'tbl_to_statuses',
      entityId: String(created.statusId),
      createdBy,
      oldValues: null,
      newValues: created,
      comment: `Time off status "${created.statusName}" created`,
    });

    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create status' });
  }
});

// PUT /time-off-statuses/:id
router.put('/:id', requirePermission('TimeOffStatuses', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const updatedBy = req.user?.email ?? 'unknown';
    const { statusName, statusShortName } = req.body as UpdateTimeOffStatusDTO;

    if (!statusName || typeof statusName !== 'string') {
      return res.status(400).json({ error: 'statusName is required' });
    }

    const before = await getStatusById(id);
    if (!before) return res.status(404).json({ error: 'Status not found' });

    const updated = await updateStatus(id, statusName.trim(), statusShortName?.trim() || undefined);

    await auditOrchestrator.log({
      entityName: 'tbl_to_statuses',
      entityId: String(id),
      createdBy: updatedBy,
      oldValues: before,
      newValues: updated,
      comment: `Time off status updated to "${updated?.statusName}"`,
    });

    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /time-off-statuses/:id
router.delete('/:id', requirePermission('TimeOffStatuses', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const deletedBy = req.user?.email ?? 'unknown';

    const before = await getStatusById(id);
    if (!before) return res.status(404).json({ error: 'Status not found' });

    await deleteStatus(id);

    await auditOrchestrator.log({
      entityName: 'tbl_to_statuses',
      entityId: String(id),
      createdBy: deletedBy,
      oldValues: before,
      newValues: null,
      comment: `Time off status "${before.statusName}" deleted`,
    });

    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete status' });
  }
});

export default router;
