import express from 'express';
import type { Request, Response } from 'express';
import type { TimeOffStatus } from '@prisma/client';
import {
  getAllStatuses,
  getStatusById,
  getStatusByName,
  createStatus,
  updateStatus,
  deleteStatus,
} from '../db/timeOffStatuses';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /time-off-statuses
router.get('/', requirePermission('TimeOffStatuses', 'read'), async (req: Request, res: Response) => {
  try {
    const statuses: TimeOffStatus[] = await getAllStatuses();
    res.json(statuses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// GET /time-off-statuses/by-name/:name
router.get('/by-name/:name', requirePermission('TimeOffStatuses', 'read'), async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// GET /time-off-statuses/:id
router.get('/:id', requirePermission('TimeOffStatuses', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const status = await getStatusById(id);
    if (!status) return res.status(404).json({ error: 'Status not found' });

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST /time-off-statuses
router.post('/', requirePermission('TimeOffStatuses', 'create'), async (req: Request, res: Response) => {
  try {
    const { statusName } = req.body as { statusName?: string };
    if (!statusName || typeof statusName !== 'string') {
      return res.status(400).json({ error: 'statusName is required' });
    }

    const created = await createStatus(statusName);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create status' });
  }
});

// PUT /time-off-statuses/:id
router.put('/:id', requirePermission('TimeOffStatuses', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { statusName } = req.body as { statusName?: string };
    if (!statusName || typeof statusName !== 'string') {
      return res.status(400).json({ error: 'statusName is required' });
    }

    const updated = await updateStatus(id, statusName);
    if (!updated) return res.status(404).json({ error: 'Status not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /time-off-statuses/:id
router.delete('/:id', requirePermission('TimeOffStatuses', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteStatus(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete status' });
  }
});

export default router;
