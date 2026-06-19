import express from 'express';
import type { Request, Response } from 'express';
import { getAllAuthUsersWithRoles } from '../db/rbacAuthUsers';
import { getRbacUserRolesByUserWithRole } from '../db/rbacUserRoles';
import { getUserById } from '../db/users';
import authUserQueries from '../db/authUsers';
import { requirePermission } from '../middleware/auth';
import { catchHandler } from './routeUtils';
import { AppError } from '../errors/AppError';
import type { AuthUserDetailDTO } from '../../shared/dto/AuthUserDetail';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import type { AuthenticatedRequest } from '../middleware/auth';
import { actorEmail } from './routeUtils';
import { error } from '../logger';

const router = express.Router();

// GET /rbac/auth-users
router.get('/', requirePermission('RBACUserRoles', 'read'), async (_req: Request, res: Response) => {
  try {
    const items = await getAllAuthUsersWithRoles();
    res.json({ data: items });
  } catch (err) {
    catchHandler(err, res);
  }
});

// GET /rbac/auth-users/by-ds-user/:dsUserId
router.get(
  '/by-ds-user/:dsUserId',
  requirePermission('RBACUserRoles', 'read'),
  async (req: Request, res: Response) => {
    try {
      const dsUserId = Number(req.params.dsUserId);
      if (Number.isNaN(dsUserId)) throw new AppError('Invalid user ID', 400);

      const dsUser = await getUserById(dsUserId);
      if (!dsUser) throw new AppError('DS user not found', 404);

      const authUser = await authUserQueries.getUserByEmail(dsUser.userEmail);
      if (!authUser) {
        return res.json({ data: null });
      }

      const userRoles = await getRbacUserRolesByUserWithRole(authUser.id);
      const first = userRoles[0] ?? null;

      const result: AuthUserDetailDTO = {
        id: authUser.id,
        oneloginId: authUser.oneloginId,
        email: authUser.email,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        avatarUrl: authUser.avatarUrl,
        lastLogin: authUser.lastLogin?.toISOString() ?? null,
        inlineRoles: authUser.roles,
        rbacRole: first
          ? {
              roleId: first.roleId,
              roleName: first.role.roleName,
              roleDescription: first.role.roleDescription ?? null,
            }
          : null,
      };

      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  }
);

// PUT /rbac/auth-users/:authUserId/inline-roles
router.put(
  '/:authUserId/inline-roles',
  requirePermission('RBACUserRoles', 'create'),
  async (req: Request, res: Response) => {
    try {
      const authUserId = Number(req.params.authUserId);
      if (Number.isNaN(authUserId)) throw new AppError('Invalid auth user ID', 400);

      const { roles } = req.body as { roles: unknown };
      if (!Array.isArray(roles) || roles.some((r) => typeof r !== 'string')) {
        throw new AppError('roles must be an array of strings', 400);
      }

      const existing = await authUserQueries.getUserById(authUserId);
      if (!existing) throw new AppError('Auth user not found', 404);

      const updated = await authUserQueries.updateUserRoles(authUserId, roles as string[]);

      auditOrchestrator
        .log({
          entityName: 'auth_users',
          entityId: String(authUserId),
          createdBy: actorEmail(req as AuthenticatedRequest),
          oldValues: { roles: existing.roles } as unknown as Record<string, unknown>,
          newValues: { roles: updated.roles } as unknown as Record<string, unknown>,
          comment: `Inline roles updated for auth user ${authUserId}`,
        })
        .catch((auditErr) => error('Audit log failed for auth_users inline-roles update:', auditErr));

      res.json({ data: { id: updated.id, roles: updated.roles } });
    } catch (err) {
      catchHandler(err, res);
    }
  }
);

export default router;
