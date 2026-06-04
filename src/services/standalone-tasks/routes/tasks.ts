import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { standaloneTaskOrchestrator } from '../StandaloneTaskOrchestrator';
import type { CreateStandaloneTaskDTO, ResolveStandaloneTaskDTO } from '@shared/dto';
import { dsUserId, tmId, catchHandler } from './routeUtils';

const router = Router();

// POST /api/standalone-tasks
router.post(
  '/',
  requirePermission('StandaloneTaskAdmin', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as CreateStandaloneTaskDTO;
      const task = await standaloneTaskOrchestrator.createTask(body, dsUserId(req), req.user?.email ?? '');
      res.status(201).json({ data: task });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// GET /api/standalone-tasks
router.get(
  '/',
  requirePermission('StandaloneTaskAdmin', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const showResolved = req.query['showResolved'] === 'true';
      const tasks = await standaloneTaskOrchestrator.getAdminTaskList({ showResolved });
      res.json({ data: tasks });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// GET /api/standalone-tasks/my-tasks  — MUST be before /:tskId
router.get(
  '/my-tasks',
  requirePermission('StandaloneTask', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tasks = await standaloneTaskOrchestrator.getTaskInbox(tmId(req));
      res.json({ data: tasks });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// GET /api/standalone-tasks/:tskId
router.get(
  '/:tskId',
  requirePermission('StandaloneTask', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tskId = parseInt(req.params['tskId'] ?? '', 10);
      if (isNaN(tskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }
      const task = await standaloneTaskOrchestrator.getTaskById(tskId);
      res.json({ data: task });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// PATCH /api/standalone-tasks/:tskId/resolve
router.patch(
  '/:tskId/resolve',
  requirePermission('StandaloneTask', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tskId = parseInt(req.params['tskId'] ?? '', 10);
      if (isNaN(tskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }
      const body = req.body as ResolveStandaloneTaskDTO;
      const task = await standaloneTaskOrchestrator.resolveTask(tskId, body, dsUserId(req), req.user?.email ?? '');
      res.json({ data: task });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
