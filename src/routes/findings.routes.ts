import express from 'express';
import type { Response } from 'express';
import { findingsOrchestrator } from '../services/findings/FindingsOrchestrator';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.get('/statuses', requirePermission('Findings', 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ data: await findingsOrchestrator.getStatusCounts('project') });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.get('/', requirePermission('Findings', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = req.query.status;
    const status = typeof raw === 'string' && raw !== '' ? raw : undefined;
    res.json({ data: await findingsOrchestrator.getFindings('project', status) });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.post('/run', requirePermission('Findings', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await findingsOrchestrator.runFindings(req.user!.email);
    res.status(201).json({ data: result });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.post('/run-rules', requirePermission('Findings', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await findingsOrchestrator.runStateRules(req.user!.email);
    res.status(201).json({ data: result });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
