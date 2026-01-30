import express from 'express';
import type { Request, Response } from 'express';
import type { RolePermission } from '@prisma/client';
import {
  getAllRbacRolePermissions,
  getRbacRolePermissionsByRole,
  getRbacRolePermissionsByPermission,
  createRbacRolePermission,
  deleteRbacRolePermission,
} from '../db/rbacRolePermissions';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /rbac/role-permissions
router.get('/', requirePermission('RBACRolePermissions', 'read'), async (_req: Request, res: Response) => {
  try {
    const items: RolePermission[] = await getAllRbacRolePermissions();
    res.json(items);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// GET /rbac/role-permissions/role/:rol_id
router.get('/role/:rol_id', requirePermission('RBACRolePermissions', 'read'), async (req: Request, res: Response) => {
  try {
    const rolId = Number(req.params.rol_id);
    if (Number.isNaN(rolId)) return res.status(400).json({ error: 'Invalid rol_id' });

    const items = await getRbacRolePermissionsByRole(rolId);
    res.json(items);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch role permissions by role' });
  }
});

// GET /rbac/role-permissions/permission/:per_id
router.get('/permission/:per_id', requirePermission('RBACRolePermissions', 'read'), async (req: Request, res: Response) => {
  try {
    const perId = Number(req.params.per_id);
    if (Number.isNaN(perId)) return res.status(400).json({ error: 'Invalid per_id' });

    const items = await getRbacRolePermissionsByPermission(perId);
    res.json(items);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch role permissions by permission' });
  }
});

// POST /rbac/role-permissions
router.post('/', requirePermission('RBACRolePermissions', 'create'), async (req: Request, res: Response) => {
  try {
    const { rol_id, per_id } = req.body as { rol_id?: number; per_id?: number };

    if (typeof rol_id !== 'number' || typeof per_id !== 'number') {
      return res.status(400).json({ error: 'rol_id and per_id are required' });
    }

    const created = await createRbacRolePermission(rol_id, per_id);
    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create role permission' });
  }
});

// DELETE /rbac/role-permissions/role/:rol_id/permission/:per_id
router.delete('/role/:rol_id/permission/:per_id', requirePermission('RBACRolePermissions', 'delete'), async (req: Request, res: Response) => {
  try {
    const rolId = Number(req.params.rol_id);
    const perId = Number(req.params.per_id);

    if (Number.isNaN(rolId) || Number.isNaN(perId)) {
      return res.status(400).json({ error: 'Invalid rol_id or per_id' });
    }

    await deleteRbacRolePermission(rolId, perId);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete role permission' });
  }
});

export default router;
