import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { apiKeyOrchestrator } from '../ApiKeyOrchestrator';
import { dsUserId, actorEmail, catchHandler } from '../../../routes/routeUtils';
import type { IssueApiKeyDTO } from '@shared/dto';

const router = Router();

// GET /api/admin/api-keys
router.get(
  '/',
  requirePermission('StandaloneTaskAdmin', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const keys = await apiKeyOrchestrator.listKeys();
      res.json({ data: keys });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// POST /api/admin/api-keys
router.post(
  '/',
  requirePermission('StandaloneTaskAdmin', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as IssueApiKeyDTO;
      const result = await apiKeyOrchestrator.issueKey(
        body,
        dsUserId(req),
        actorEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// PATCH /api/admin/api-keys/:apkId/revoke
router.patch(
  '/:apkId/revoke',
  requirePermission('StandaloneTaskAdmin', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const apkId = parseInt(req.params['apkId'] ?? '', 10);
      if (isNaN(apkId)) {
        res.status(400).json({ error: 'Invalid API key ID' });
        return;
      }
      const updated = await apiKeyOrchestrator.revokeKey(apkId, actorEmail(req));
      res.json({ data: updated });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// DELETE /api/admin/api-keys/:apkId
router.delete(
  '/:apkId',
  requirePermission('StandaloneTaskAdmin', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const apkId = parseInt(req.params['apkId'] ?? '', 10);
      if (isNaN(apkId)) {
        res.status(400).json({ error: 'Invalid API key ID' });
        return;
      }
      await apiKeyOrchestrator.deleteKey(apkId, actorEmail(req));
      res.status(204).send();
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
