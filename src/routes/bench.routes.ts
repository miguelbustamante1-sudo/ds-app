import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { benchOrchestrator } from '../services/bench/BenchOrchestrator';
import { BenchMoveValidationError } from '../services/bench/components/ValidateBenchMove';
import { EndBenchValidationError } from '../services/bench/components/ValidateEndBench';
import type { CreateBenchMoveDTO, EndBenchDTO } from '@shared/dto/Bench';

const router = Router();

/** POST /api/bench-move — Create a bench move (atomic) */
router.post(
  '/',
  requirePermission('BenchMove', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user?.email ?? 'unknown';
      const supervisorTeamMemberId = req.user?.teamMemberId;
      if (!supervisorTeamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const dto: CreateBenchMoveDTO = req.body;
      const result = await benchOrchestrator.createBenchMove(dto, createdBy, supervisorTeamMemberId);
      res.status(201).json(result);
    } catch (err: unknown) {
      if (err instanceof BenchMoveValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

/** GET /api/bench-move/active?teamMemberId=:id — Active bench record for a TM
 *  MUST be registered before /:benchId to prevent Express matching "active" as an ID. */
router.get(
  '/active',
  requirePermission('BenchMove', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = parseInt(String(req.query.teamMemberId ?? ''), 10);
      if (isNaN(teamMemberId)) {
        res.status(400).json({ error: 'teamMemberId query parameter is required and must be a number.' });
        return;
      }
      const detail = await benchOrchestrator.getActiveBench(teamMemberId);
      res.json(detail);
    } catch (err: unknown) {
      const statusCode = (err as Record<string, unknown>).statusCode;
      if (statusCode === 404) {
        res.status(404).json({ error: 'No active bench record found for this team member.' });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

/** GET /api/bench-move/:benchId — Bench detail */
router.get(
  '/:benchId',
  requirePermission('BenchMove', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const benchId = parseInt(req.params.benchId ?? '', 10);
      if (isNaN(benchId)) {
        res.status(400).json({ error: 'Invalid bench ID.' });
        return;
      }
      const detail = await benchOrchestrator.getBenchDetail(benchId);
      res.json(detail);
    } catch (err: unknown) {
      const statusCode = (err as Record<string, unknown>).statusCode;
      if (statusCode === 404) {
        res.status(404).json({ error: 'Bench record not found.' });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

/** PATCH /api/bench-move/:benchId/end — Set bench end date */
router.patch(
  '/:benchId/end',
  requirePermission('BenchMove', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updatedBy = req.user?.email ?? 'unknown';
      const benchId = parseInt(req.params.benchId ?? '', 10);
      if (isNaN(benchId)) {
        res.status(400).json({ error: 'Invalid bench ID.' });
        return;
      }
      const { endDate }: EndBenchDTO = req.body;
      if (!endDate) {
        res.status(400).json({ error: 'endDate is required.' });
        return;
      }
      await benchOrchestrator.endBench(benchId, endDate, updatedBy);
      res.status(200).json({ success: true });
    } catch (err: unknown) {
      if (err instanceof EndBenchValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

export default router;
