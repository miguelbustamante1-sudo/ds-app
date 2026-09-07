import { Router, Response } from 'express';
import { AppError } from '../../../errors/AppError';
import { AuthenticatedRequest, requirePermission } from '../../../middleware/auth';
import { getActingAsUsers } from '../../users/queries/getActingAsUsers';

const router = Router();

function catchHandler(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// GET /api/workflow/users — users with a linked team member, for ComboBoxes
// that assign a task to a specific usr_id (value) showing their name + workdayId (label).
router.get(
  '/',
  requirePermission('Workflow', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await getActingAsUsers();
      res.json({ data: users });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

export default router;
