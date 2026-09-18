import express from 'express';
import type { Response } from 'express';
import { watchedFieldsOrchestrator } from '../services/watched-fields/WatchedFieldsOrchestrator';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

function fail(res: Response, err: unknown) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

router.get('/entities', requirePermission('WatchedFields', 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ data: await watchedFieldsOrchestrator.getEntities() });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/entities', requirePermission('WatchedFields', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await watchedFieldsOrchestrator.createEntity(req.body, req.user!.email);
    res.status(201).json({ data: created });
  } catch (err) {
    fail(res, err);
  }
});

router.patch(
  '/entities/:entityType/active',
  requirePermission('WatchedFields', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { active } = req.body ?? {};
      if (typeof active !== 'boolean') {
        res.status(400).json({ error: 'active must be a boolean' });
        return;
      }
      const updated = await watchedFieldsOrchestrator.setEntityActive(
        req.params.entityType ?? '',
        active,
        req.user!.email,
      );
      res.json({ data: updated });
    } catch (err) {
      fail(res, err);
    }
  },
);

router.get(
  '/entities/:entityType/fields',
  requirePermission('WatchedFields', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({ data: await watchedFieldsOrchestrator.getFields(req.params.entityType ?? '') });
    } catch (err) {
      fail(res, err);
    }
  },
);

router.post('/fields', requirePermission('WatchedFields', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await watchedFieldsOrchestrator.createField(req.body, req.user!.email);
    res.status(201).json({ data: created });
  } catch (err) {
    fail(res, err);
  }
});

router.put('/fields/:fieldId', requirePermission('WatchedFields', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fieldId = Number(req.params.fieldId);
    if (!Number.isInteger(fieldId)) {
      res.status(400).json({ error: 'Invalid field id' });
      return;
    }
    const updated = await watchedFieldsOrchestrator.updateField(fieldId, req.body, req.user!.email);
    res.json({ data: updated });
  } catch (err) {
    fail(res, err);
  }
});

export default router;
