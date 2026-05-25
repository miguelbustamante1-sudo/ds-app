import { Router, Response } from 'express';
import { AppError } from '../../../errors/AppError';
import { AuthenticatedRequest, requirePermission } from '../../../middleware/auth';
import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { taskCompletionOrchestrator } from '../TaskCompletionOrchestrator';
import { retryTask } from '../components/RetryTaskHandler';
import { claimTask, unclaimTask } from '../components/ClaimTask';
import { reassignTask } from '../components/ReassignTask';
import { getTaskInbox } from '../components/GetTaskInbox';
import { WorkflowInstanceNotFoundError } from '../errors';

const router = Router();

// Safe access helpers — requirePermission ensures req.user is populated before handlers run.
function userId(req: AuthenticatedRequest): number {
  return req.user?.dsUserId ?? 0;
}
function userIdStr(req: AuthenticatedRequest): string {
  return req.user?.dsUserId?.toString() ?? '';
}
function userEmail(req: AuthenticatedRequest): string {
  return req.user?.email ?? '';
}

function catchHandler(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// GET /api/workflow/inbox
router.get(
  '/inbox',
  requirePermission('Workflow', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const items = await getTaskInbox({
        dsUserId: userId(req),
        // TODO: full admin override is deferred. Pass false until a dedicated
        // admin permission is defined for the Workflow resource.
        isAdmin: false,
      });
      res.json({ data: items });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// GET /api/workflow/instances/:winId/tasks
router.get(
  '/instances/:winId/tasks',
  requirePermission('Workflow', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { winId } = req.params as { winId: string };
      const tasks = await prisma.witWorkflowInstanceTask.findMany({
        where: { winId },
        include: { inputs: true },
      });
      res.json({ data: tasks });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// GET /api/workflow/instances/:winId/tasks/:witId
router.get(
  '/instances/:winId/tasks/:witId',
  requirePermission('Workflow', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { witId } = req.params as { winId: string; witId: string };
      const task = await prisma.witWorkflowInstanceTask.findUnique({
        where: { witId },
        include: {
          inputs: {
            include: { inputValues: true },
          },
        },
      });

      if (!task) {
        throw new WorkflowInstanceNotFoundError('Task not found');
      }

      res.json({ data: task });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// POST /api/workflow/instances/:winId/tasks/:witId/complete
router.post(
  '/instances/:winId/tasks/:witId/complete',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { witId } = req.params as { winId: string; witId: string };
      const { outcomeCode, inputs, comment } = req.body as {
        outcomeCode?: string;
        inputs?: Array<{ wiiId: string; value: unknown }>;
        comment?: string;
      };

      if (!outcomeCode) {
        res.status(400).json({ error: 'outcomeCode is required' });
        return;
      }

      const result = await taskCompletionOrchestrator.complete({
        witId,
        outcomeCode,
        inputs: inputs ?? [],
        comment,
        completedBy: userEmail(req),
        completedByUserId: userIdStr(req),
        // TODO: full admin override is deferred. Pass false until a dedicated
        // admin permission is defined for the Workflow resource.
        isAdmin: false,
      });

      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// POST /api/workflow/instances/:winId/tasks/:witId/retry
router.post(
  '/instances/:winId/tasks/:witId/retry',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { witId } = req.params as { winId: string; witId: string };
      const retriedBy = userEmail(req);
      const retriedByUserId = userIdStr(req);

      const result = await prisma.$transaction(async (tx) => {
        return retryTask(tx, witId, retriedBy, retriedByUserId);
      });

      await auditOrchestrator.log({
        entityName: 'wit_workflow_instance_tasks',
        entityId: witId,
        createdBy: retriedBy,
        oldValues: null,
        newValues: result as unknown as Record<string, unknown>,
        comment: 'Task retried',
      });

      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// POST /api/workflow/instances/:winId/tasks/:witId/claim
router.post(
  '/instances/:winId/tasks/:witId/claim',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { witId } = req.params as { winId: string; witId: string };
      const claimedBy = userEmail(req);
      const claimedByUserId = userId(req);

      const result = await prisma.$transaction(async (tx) => {
        return claimTask(tx, witId, claimedBy, claimedByUserId);
      });

      await auditOrchestrator.log({
        entityName: 'wit_workflow_instance_tasks',
        entityId: witId,
        createdBy: claimedBy,
        oldValues: null,
        newValues: result as unknown as Record<string, unknown>,
        comment: 'Task claimed',
      });

      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// POST /api/workflow/instances/:winId/tasks/:witId/unclaim
router.post(
  '/instances/:winId/tasks/:witId/unclaim',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { witId } = req.params as { winId: string; witId: string };
      const unclaimedBy = userEmail(req);
      const unclaimedByUserId = userId(req);

      const result = await prisma.$transaction(async (tx) => {
        return unclaimTask(tx, witId, unclaimedBy, unclaimedByUserId);
      });

      await auditOrchestrator.log({
        entityName: 'wit_workflow_instance_tasks',
        entityId: witId,
        createdBy: unclaimedBy,
        oldValues: null,
        newValues: result as unknown as Record<string, unknown>,
        comment: 'Task unclaimed',
      });

      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// POST /api/workflow/instances/:winId/tasks/:witId/reassign
router.post(
  '/instances/:winId/tasks/:witId/reassign',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { toUserId, toRoleId, reason } = req.body as {
        toUserId?: number;
        toRoleId?: string;
        reason: string;
      };
      const { witId } = req.params as { winId: string; witId: string };
      const result = await reassignTask({
        witId,
        ...(toUserId !== undefined ? { toUserId } : {}),
        ...(toRoleId !== undefined ? { toRoleId } : {}),
        reason,
        reassignedBy: userEmail(req),
        reassignedByUserId: userIdStr(req),
      });
      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

export default router;
