import { Router, Response } from 'express';
import { AppError } from '../../../errors/AppError';
import { AuthenticatedRequest, requirePermission } from '../../../middleware/auth';
import { adminTaskJump } from '../components/AdminTaskJump';
import { adminForceComplete } from '../components/AdminForceComplete';
import { adminDestroyWorkflow } from '../components/AdminDestroyWorkflow';
import { getWorkflowAuditLog } from '../components/GetWorkflowAuditLog';

const router = Router();

// Safe access helpers — requirePermission ensures req.user is populated before handlers run.
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

// POST /api/workflow/instances/:winId/jump
router.post(
  '/instances/:winId/jump',
  requirePermission('WorkflowAdmin', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { winId } = req.params as { winId: string };
      const { targetWitId, reason, inputs } = req.body as {
        targetWitId?: string;
        reason?: string;
        inputs?: Array<{ wiiId: string; value: unknown }>;
      };

      if (!reason) {
        res.status(400).json({ error: 'reason is required' });
        return;
      }
      if (!targetWitId) {
        res.status(400).json({ error: 'targetWitId is required' });
        return;
      }

      const result = await adminTaskJump({
        winId,
        targetWitId,
        reason,
        inputs,
        performedBy: userEmail(req),
        performedByUserId: userId(req),
      });

      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// POST /api/workflow/instances/:winId/force-complete
router.post(
  '/instances/:winId/force-complete',
  requirePermission('WorkflowAdmin', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { winId } = req.params as { winId: string };
      const { reason } = req.body as { reason?: string };

      if (!reason) {
        res.status(400).json({ error: 'reason is required' });
        return;
      }

      const result = await adminForceComplete({
        winId,
        reason,
        performedBy: userEmail(req),
        performedByUserId: userId(req),
      });

      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// POST /api/workflow/instances/:winId/destroy
router.post(
  '/instances/:winId/destroy',
  requirePermission('WorkflowAdmin', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { winId } = req.params as { winId: string };
      const { reason } = req.body as { reason?: string };

      if (!reason) {
        res.status(400).json({ error: 'reason is required' });
        return;
      }

      const result = await adminDestroyWorkflow({
        winId,
        reason,
        performedBy: userEmail(req),
        performedByUserId: userId(req),
      });

      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

// GET /api/workflow/instances/:winId/audit-log
router.get(
  '/instances/:winId/audit-log',
  requirePermission('WorkflowAdmin', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { winId } = req.params as { winId: string };
      const { witId } = req.query as { witId?: string };

      const result = await getWorkflowAuditLog({ winId, witId });

      res.json({ data: result });
    } catch (err: unknown) {
      catchHandler(err, res);
    }
  },
);

export default router;
