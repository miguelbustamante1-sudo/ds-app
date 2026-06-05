import express from 'express';
import type { Request, Response } from 'express';
import { getAllAuthUsersWithRoles } from '../db/rbacAuthUsers';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /rbac/auth-users
router.get('/', requirePermission('RBACUserRoles', 'read'), async (_req: Request, res: Response) => {
  try {
    const items = await getAllAuthUsersWithRoles();
    res.json({ data: items });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch auth users' });
  }
});

export default router;
