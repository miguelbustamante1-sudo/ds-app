import express from 'express';
import type { Response } from 'express';
import { detectionRulesOrchestrator } from '../services/detection-rules/DetectionRulesOrchestrator';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Rules are managed by whoever can run findings — no separate RBAC resource.
const RESOURCE = 'Findings';

function fail(res: Response, err: unknown) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

function parseRuleId(req: AuthenticatedRequest, res: Response): number | null {
  const ruleId = Number(req.params.ruleId);
  if (!Number.isInteger(ruleId)) {
    res.status(400).json({ error: 'Invalid rule id' });
    return null;
  }
  return ruleId;
}

router.get('/', requirePermission(RESOURCE, 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ data: await detectionRulesOrchestrator.getRules() });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/entity-types', requirePermission(RESOURCE, 'read'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ data: await detectionRulesOrchestrator.getEntityTypes() });
  } catch (err) {
    fail(res, err);
  }
});

router.post('/', requirePermission(RESOURCE, 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await detectionRulesOrchestrator.createRule(req.body, req.user!.email);
    res.status(201).json({ data: created });
  } catch (err) {
    fail(res, err);
  }
});

router.put('/:ruleId', requirePermission(RESOURCE, 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ruleId = parseRuleId(req, res);
    if (ruleId === null) return;
    res.json({ data: await detectionRulesOrchestrator.updateRule(ruleId, req.body ?? {}, req.user!.email) });
  } catch (err) {
    fail(res, err);
  }
});

router.patch('/:ruleId/active', requirePermission(RESOURCE, 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ruleId = parseRuleId(req, res);
    if (ruleId === null) return;
    const { active } = req.body ?? {};
    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'active must be a boolean' });
      return;
    }
    res.json({ data: await detectionRulesOrchestrator.setRuleActive(ruleId, active, req.user!.email) });
  } catch (err) {
    fail(res, err);
  }
});

export default router;
