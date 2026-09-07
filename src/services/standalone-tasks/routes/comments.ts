import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { standaloneTaskOrchestrator } from '../StandaloneTaskOrchestrator';
import type { AddStandaloneTaskCommentDTO } from '@shared/dto';
import { dsUserId, catchHandler } from '../../../routes/routeUtils';

const router = Router();

// POST /api/standalone-tasks/:tskId/comments
router.post(
  '/:tskId/comments',
  requirePermission('StandaloneTask', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tskId = parseInt(req.params['tskId'] ?? '', 10);
      if (isNaN(tskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }
      const body = req.body as AddStandaloneTaskCommentDTO;
      const comment = await standaloneTaskOrchestrator.addComment(tskId, body, dsUserId(req), req.user?.email ?? '');
      res.status(201).json({ data: comment });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// GET /api/standalone-tasks/:tskId/comments
router.get(
  '/:tskId/comments',
  requirePermission('StandaloneTask', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tskId = parseInt(req.params['tskId'] ?? '', 10);
      if (isNaN(tskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }
      const comments = await standaloneTaskOrchestrator.getComments(tskId);
      res.json({ data: comments });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
