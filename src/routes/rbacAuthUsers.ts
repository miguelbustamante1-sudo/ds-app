import express from 'express';
import type { Request, Response } from 'express';
import { getAllAuthUsersWithRoles } from '../db/rbacAuthUsers';
import { requirePermission } from '../middleware/auth';
import { catchHandler } from './routeUtils';

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

export default router;
