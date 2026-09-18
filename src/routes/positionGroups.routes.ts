import { Router, Request, Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { positionGroupOrchestrator } from '../services/positionGroup/PositionGroupOrchestrator';
import { AppError } from '../errors/AppError';
import { error } from '../logger';

const router = Router();

function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// GET /api/position-groups/technologies?posId
// Empty array means this position has a fixed Group and needs no Technology selector.
router.get(
  '/technologies',
  requirePermission('Endorsements', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const posId = parsePositiveInt((req as Request).query.posId);
      if (!posId) {
        res.status(400).json({ error: 'posId is required and must be a positive integer' });
        return;
      }

      const technologies = await positionGroupOrchestrator.getTechnologies(posId);
      res.json({ data: technologies });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to fetch technologies for position' });
    }
  },
);

// GET /api/position-groups/derive?posId&tecId
router.get(
  '/derive',
  requirePermission('Endorsements', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const query = (req as Request).query;
      const posId = parsePositiveInt(query.posId);
      const tecId = parsePositiveInt(query.tecId);

      if (!posId) {
        res.status(400).json({ error: 'posId is required and must be a positive integer' });
        return;
      }

      const result = await positionGroupOrchestrator.deriveGroup(posId, tecId);
      res.json({ data: result });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to derive group' });
    }
  },
);

export default router;
