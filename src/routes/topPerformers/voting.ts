import { Router, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from '../../middleware/auth';
import { AppError } from '../../errors/AppError';
import { submitVote } from '../../services/topPerformers/voting/votingService';
import { getApprovedNominations, hasVoted } from '../../services/topPerformers/voting/votingQueries';
import type { VoteItemInput } from '../../services/topPerformers/voting/votingService';

const router = Router();

// GET /api/top-performers/voting/nominations?cycId=X
router.get('/nominations', requirePermission('TopPerformers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) throw new AppError('Unauthenticated', 401);
    const cycId = parseInt(req.query.cycId as string, 10);
    if (isNaN(cycId)) throw new AppError('cycId required', 400);
    const nominations = await getApprovedNominations(cycId, teamMemberId);
    const alreadyVoted = await hasVoted(cycId, teamMemberId);
    res.json({ data: { nominations, alreadyVoted } });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/top-performers/voting/votes
router.post('/votes', requirePermission('TopPerformers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dsUserId = req.user?.dsUserId;
    const teamMemberId = req.user?.teamMemberId;
    const email = req.user?.email;
    if (!dsUserId || !teamMemberId || !email) throw new AppError('Unauthenticated', 401);

    const { cycId, items } = req.body as { cycId: number; items: VoteItemInput[] };

    await submitVote({
      cycId,
      voterTeamMemberId: teamMemberId,
      items,
      createdBy: dsUserId,
      userEmail: email,
    });

    res.status(201).json({ data: { message: 'Vote submitted successfully' } });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
