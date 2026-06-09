import express from 'express';
import type { Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import {
  getAllRbacUserRoles,
  getRbacUserRolesByUser,
  getRbacUserRolesByRole,
  createRbacUserRole,
  deleteRbacUserRole,
} from '../db/rbacUserRoles';
import { requirePermission } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import type { AuthenticatedRequest } from '../middleware/auth';
import { actorEmail, catchHandler } from './routeUtils';
import { Prisma } from '@prisma/client';
import { error } from '../logger';

const router = express.Router();

// GET /rbac/user-roles
router.get('/', requirePermission('RBACUserRoles', 'read'), async (_req: Request, res: Response) => {
  try {
    const items: UserRole[] = await getAllRbacUserRoles();
    res.json({ data: items });
  } catch (err) {
    catchHandler(err, res);
  }
});

// GET /rbac/user-roles/user/:usr_id
router.get('/user/:usr_id', requirePermission('RBACUserRoles', 'read'), async (req: Request, res: Response) => {
  try {
    const usrId = Number(req.params.usr_id);
    if (Number.isNaN(usrId)) return res.status(400).json({ error: 'Invalid usr_id' });

    const items = await getRbacUserRolesByUser(usrId);
    res.json({ data: items });
  } catch (err) {
    catchHandler(err, res);
  }
});

// GET /rbac/user-roles/role/:rol_id
router.get('/role/:rol_id', requirePermission('RBACUserRoles', 'read'), async (req: Request, res: Response) => {
  try {
    const rolId = Number(req.params.rol_id);
    if (Number.isNaN(rolId)) return res.status(400).json({ error: 'Invalid rol_id' });

    const items = await getRbacUserRolesByRole(rolId);
    res.json({ data: items });
  } catch (err) {
    catchHandler(err, res);
  }
});

// POST /rbac/user-roles
router.post('/', requirePermission('RBACUserRoles', 'create'), async (req: Request, res: Response) => {
  try {
    const { usr_id, rol_id } = req.body as { usr_id?: number; rol_id?: number };

    if (typeof usr_id !== 'number' || typeof rol_id !== 'number') {
      return res.status(400).json({ error: 'usr_id and rol_id are required' });
    }

    const created = await createRbacUserRole(usr_id, rol_id);

    auditOrchestrator
      .log({
        entityName: 'uro_user_roles',
        entityId: `${created.userId}_${created.roleId}`,
        createdBy: actorEmail(req as AuthenticatedRequest),
        oldValues: null,
        newValues: created as unknown as Record<string, unknown>,
        comment: `Role ${created.roleId} assigned to user ${created.userId}`,
      })
      .catch((auditErr) => error('Audit log failed for uro_user_roles create:', auditErr));

    res.status(201).json({ data: created });
  } catch (err) {
    catchHandler(err, res);
  }
});

// DELETE /rbac/user-roles/user/:usr_id/role/:rol_id
router.delete('/user/:usr_id/role/:rol_id', requirePermission('RBACUserRoles', 'delete'), async (req: Request, res: Response) => {
  try {
    const usrId = Number(req.params.usr_id);
    const rolId = Number(req.params.rol_id);

    if (Number.isNaN(usrId) || Number.isNaN(rolId)) {
      return res.status(400).json({ error: 'Invalid usr_id or rol_id' });
    }

    const existing = await getRbacUserRolesByUser(usrId);
    const record = existing.find((r) => r.roleId === rolId);

    if (!record) {
      return res.status(404).json({ error: 'User role assignment not found' });
    }

    await deleteRbacUserRole(usrId, rolId);

    // Audit is fire-and-forget — a logging failure must not roll back the delete
    auditOrchestrator
      .log({
        entityName: 'uro_user_roles',
        entityId: `${usrId}_${rolId}`,
        createdBy: actorEmail(req as AuthenticatedRequest),
        oldValues: record as unknown as Record<string, unknown>,
        newValues: null,
        comment: `Role ${rolId} removed from user ${usrId}`,
      })
      .catch((auditErr) => error('Audit log failed for uro_user_roles delete:', auditErr));

    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'User role assignment not found' });
    }
    catchHandler(err, res);
  }
});

export default router;
