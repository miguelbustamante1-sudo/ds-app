import { Router, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from '../../middleware/auth';
import { AppError } from '../../errors/AppError';
import { getLeaderboard, getCandidateDetail, buildLeaderboardCsv } from '../../services/topPerformers/results/resultsQueries';
import { createOrUpdateDecision, confirmDecision } from '../../services/topPerformers/results/committeeService';

const router = Router();

const requireCommittee = requirePermission('ComitatTopPerformers', 'read');
const requireCommitteeCreate = requirePermission('ComitatTopPerformers', 'create');

// GET /api/top-performers/results/leaderboard?cycId=X
router.get('/leaderboard', requireCommittee, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycId = parseInt(req.query.cycId as string, 10);
    if (isNaN(cycId)) throw new AppError('cycId required', 400);
    const leaderboard = await getLeaderboard(cycId);
    res.json({ data: leaderboard });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// GET /api/top-performers/results/leaderboard/export?cycId=X
router.get('/leaderboard/export', requireCommittee, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycId = parseInt(req.query.cycId as string, 10);
    if (isNaN(cycId)) throw new AppError('cycId required', 400);
    const leaderboard = await getLeaderboard(cycId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="top-performers-cycle-${cycId}.csv"`);
    res.send(buildLeaderboardCsv(cycId, leaderboard));
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// GET /api/top-performers/results/candidates/:nomineeId?cycId=X
router.get('/candidates/:nomineeId', requireCommittee, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const nomineeId = parseInt(req.params['nomineeId'] ?? '', 10);
    const cycId = parseInt(req.query.cycId as string, 10);
    if (isNaN(nomineeId) || isNaN(cycId)) throw new AppError('Invalid params', 400);
    const detail = await getCandidateDetail(cycId, nomineeId);
    res.json({ data: detail });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/top-performers/results/decision
router.post('/decision', requireCommitteeCreate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dsUserId = req.user?.dsUserId;
    const email = req.user?.email;
    if (!dsUserId || !email) throw new AppError('Unauthenticated', 401);
    const { cycId, winnerId, justification } = req.body as { cycId: number; winnerId: number; justification: string };
    await createOrUpdateDecision(cycId, winnerId, justification, dsUserId, email);
    res.status(201).json({ data: { message: 'Decision saved' } });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/top-performers/results/decision/confirm
router.post('/decision/confirm', requireCommitteeCreate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dsUserId = req.user?.dsUserId;
    const email = req.user?.email;
    if (!dsUserId || !email) throw new AppError('Unauthenticated', 401);
    const { cycId } = req.body as { cycId: number };
    await confirmDecision(cycId, dsUserId, email);
    res.json({ data: { message: 'Confirmation recorded' } });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
