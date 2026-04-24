import express from 'express';
import type { Request, Response } from 'express';
import type { Permission } from '@prisma/client';
import {
  getAllRbacPermissions,
  getRbacPermissionById,
  createRbacPermission,
  updateRbacPermission,
  deleteRbacPermission,
} from '../db/rbacPermissions';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /rbac/permissions
router.get('/', requirePermission('RBACPermissions', 'read'), async (_req: Request, res: Response) => {
  try {
    const items: Permission[] = await getAllRbacPermissions();
    res.json(items);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// GET /rbac/permissions/:id
router.get('/:id', requirePermission('RBACPermissions', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const item = await getRbacPermissionById(id);
    if (!item) return res.status(404).json({ error: 'Permission not found' });

    res.json(item);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch permission' });
  }
});

// POST /rbac/permissions
router.post('/', requirePermission('RBACPermissions', 'create'), async (req: Request, res: Response) => {
  try {
    const { per_resource, per_read, per_write, per_delete, per_description, opt_id, rol_id } = req.body as {
      per_resource?: string | null;
      per_read?: boolean;
      per_write?: boolean;
      per_delete?: boolean;
      per_description?: string | null;
      opt_id?: number | null;
      rol_id?: number | null;
    };

    const created = await createRbacPermission(
      per_resource ?? null,
      typeof per_read === 'boolean' ? per_read : false,
      typeof per_write === 'boolean' ? per_write : false,
      typeof per_delete === 'boolean' ? per_delete : false,
      typeof per_description === 'string' ? per_description : null,
      typeof opt_id === 'number' ? opt_id : null,
      typeof rol_id === 'number' ? rol_id : null
    );

    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create permission' });
  }
});

// PUT /rbac/permissions/:id
router.put('/:id', requirePermission('RBACPermissions', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { per_resource, per_read, per_write, per_delete, per_description, opt_id, rol_id } = req.body as {
      per_resource?: string | null;
      per_read?: boolean;
      per_write?: boolean;
      per_delete?: boolean;
      per_description?: string | null;
      opt_id?: number | null;
      rol_id?: number | null;
    };

    const updated = await updateRbacPermission(
      id,
      per_resource !== undefined ? per_resource : undefined,
      typeof per_read === 'boolean' ? per_read : false,
      typeof per_write === 'boolean' ? per_write : false,
      typeof per_delete === 'boolean' ? per_delete : false,
      per_description !== undefined ? per_description : undefined,
      opt_id !== undefined ? opt_id : undefined,
      rol_id !== undefined ? rol_id : undefined
    );

    if (!updated) return res.status(404).json({ error: 'Permission not found' });

    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// DELETE /rbac/permissions/:id
router.delete('/:id', requirePermission('RBACPermissions', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteRbacPermission(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

export default router;
