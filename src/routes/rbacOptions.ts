import express from 'express';
import type { Request, Response } from 'express';
import type { Option } from '@prisma/client';
import {
  getAllRbacOptions,
  getRbacOptionById,
  createRbacOption,
  updateRbacOption,
  deleteRbacOption,
} from '../db/rbacOptions';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /rbac/options
router.get('/', requirePermission('RBACOptions', 'read'), async (_req: Request, res: Response) => {
  try {
    const items: Option[] = await getAllRbacOptions();
    res.json({ data: items });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
});

// GET /rbac/options/:id
router.get('/:id', requirePermission('RBACOptions', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const item = await getRbacOptionById(id);
    if (!item) return res.status(404).json({ error: 'Option not found' });

    res.json({ data: item });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch option' });
  }
});

// POST /rbac/options
router.post('/', requirePermission('RBACOptions', 'create'), async (req: Request, res: Response) => {
  try {
    const { opt_description, opt_created_by } = req.body as {
      opt_description?: string | null;
      opt_created_by?: string | null;
    };

    const created = await createRbacOption(
      opt_description ?? null,
      opt_created_by ?? null
    );

    res.status(201).json({ data: created });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create option' });
  }
});

// PUT /rbac/options/:id
router.put('/:id', requirePermission('RBACOptions', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { opt_description } = req.body as {
      opt_description?: string | null;
    };

    const updated = await updateRbacOption(id, opt_description ?? null);

    if (!updated) return res.status(404).json({ error: 'Option not found' });

    res.json({ data: updated });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update option' });
  }
});

// DELETE /rbac/options/:id
router.delete('/:id', requirePermission('RBACOptions', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteRbacOption(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

export default router;
