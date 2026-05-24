import { Router, Response } from 'express';
import { AppError } from '../../../errors/AppError';
import { AuthenticatedRequest, requirePermission } from '../../../middleware/auth';
import { workflowInstantiationOrchestrator } from '../WorkflowInstantiationOrchestrator';
import { prisma } from '../../../db/prisma';

const router = Router();

// Safe access: requirePermission ensures req.user is populated before the handler runs.
function userId(req: AuthenticatedRequest): string {
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

// POST /api/workflow/instances
router.post(
  '/',
  requirePermission('Workflow', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { wflId, winName, businessReferenceType, businessReferenceId, contextJson, ownerUserId } =
        req.body as {
          wflId?: string;
          winName?: string;
          businessReferenceType?: string;
          businessReferenceId?: string;
          contextJson?: unknown;
          ownerUserId?: string;
        };

      if (!wflId) {
        res.status(400).json({ error: 'wflId is required' });
        return;
      }

      if (!winName) {
        res.status(400).json({ error: 'winName is required' });
        return;
      }

      if (contextJson !== undefined && !Array.isArray(contextJson)) {
        res.status(400).json({ error: 'contextJson must be an array' });
        return;
      }

      const result = await workflowInstantiationOrchestrator.instantiate({
        wflId,
        winName,
        businessReferenceType,
        businessReferenceId,
        contextJson: contextJson as Array<{ key: string; value: string | number | boolean }> | undefined,
        ownerUserId,
        startedBy: userEmail(req),
        createdBy: userId(req),
      });

      res.status(201).json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// GET /api/workflow/instances — list all instances (admin)
router.get(
  '/',
  requirePermission('WorkflowAdmin', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const instances = await prisma.winWorkflowInstance.findMany({
        orderBy: { startedAt: 'desc' },
      });
      res.json({ data: instances });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// GET /api/workflow/instances/:winId — single instance with tasks (admin)
router.get(
  '/:winId',
  requirePermission('WorkflowAdmin', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { winId } = req.params as { winId: string };
      const instance = await prisma.winWorkflowInstance.findUnique({
        where: { winId },
        include: {
          tasks: {
            include: {
              inputs: true,
              inputValues: true,
            },
          },
        },
      });
      if (!instance) {
        res.status(404).json({ error: 'Instance not found' });
        return;
      }
      res.json({ data: instance });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

export default router;
