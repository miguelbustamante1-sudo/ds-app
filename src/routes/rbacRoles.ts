import express from 'express';
import type { Request, Response } from 'express';
import type { SecurityRole } from '@prisma/client';
import { getAllRbacRoles, getRbacRoleById, createRbacRole, updateRbacRole, deleteRbacRole } from '../db/rbacRoles';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /rbac/roles
router.get('/', requirePermission('RBACRoles', 'read'), async (_req: Request, res: Response) => {
  try {
    const items: SecurityRole[] = await getAllRbacRoles();
    res.json({ data: items });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /rbac/roles/:id
router.get('/:id', requirePermission('RBACRoles', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const item = await getRbacRoleById(id);
    if (!item) return res.status(404).json({ error: 'Role not found' });

    res.json({ data: item });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// POST /rbac/roles
router.post('/', requirePermission('RBACRoles', 'create'), async (req: Request, res: Response) => {
  try {
    const { rol_name, rol_description } = req.body as { rol_name?: string; rol_description?: string | null };
    if (!rol_name || typeof rol_name !== 'string') return res.status(400).json({ error: 'rol_name is required' });

    const created = await createRbacRole(rol_name, typeof rol_description === 'string' ? rol_description : null);
    res.status(201).json({ data: created });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PUT /rbac/roles/:id
router.put('/:id', requirePermission('RBACRoles', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { rol_name, rol_description } = req.body as { rol_name?: string; rol_description?: string | null };
    if (!rol_name || typeof rol_name !== 'string') return res.status(400).json({ error: 'rol_name is required' });

    const updated = await updateRbacRole(id, rol_name, typeof rol_description === 'string' ? rol_description : null);
    if (!updated) return res.status(404).json({ error: 'Role not found' });

    res.json({ data: updated });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /rbac/roles/:id
router.delete('/:id', requirePermission('RBACRoles', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteRbacRole(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;
