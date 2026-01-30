import express from 'express';
import type { Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { getAllRoles, getRoleById, createRole, updateRole, deleteRole } from '../db/roles';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /roles
router.get('/', requirePermission('Roles', 'read'), async (req: Request, res: Response) => {
  try {
    const roles: Role[] = await getAllRoles();
    res.json(roles);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /roles/:id
router.get('/:id', requirePermission('Roles', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const role = await getRoleById(id);
    if (!role) return res.status(404).json({ error: 'Role not found' });

    res.json(role);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// POST /roles
router.post('/', requirePermission('Roles', 'create'), async (req: Request, res: Response) => {
  try {
    const { rol_name, rol_description } = req.body as { rol_name?: string; rol_description?: string | null };
    if (!rol_name || typeof rol_name !== 'string') return res.status(400).json({ error: 'rol_name is required' });
    const description = typeof rol_description === 'string' ? rol_description : null;

    const created = await createRole(rol_name, description);
    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PUT /roles/:id
router.put('/:id', requirePermission('Roles', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { rol_name, rol_description } = req.body as { rol_name?: string; rol_description?: string | null };
    if (!rol_name || typeof rol_name !== 'string') return res.status(400).json({ error: 'rol_name is required' });
    const description = typeof rol_description === 'string' ? rol_description : null;

    const updated = await updateRole(id, rol_name, description);
    if (!updated) return res.status(404).json({ error: 'Role not found' });

    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /roles/:id
router.delete('/:id', requirePermission('Roles', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteRole(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;
