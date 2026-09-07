import { Router, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from '../../middleware/auth';
import { AppError } from '../../errors/AppError';
import { approveAnonymization } from '../../services/topPerformers/anonymization/anonymizationService';
import { getNominationsForReview } from '../../services/topPerformers/anonymization/anonymizationQueries';

const router = Router();

// GET /api/top-performers/anonymization?cycId=X
// TopPerformers_Admin only — exposes original un-anonymized text
router.get('/', requirePermission('TopPerformers_Admin', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycId = parseInt(req.query.cycId as string, 10);
    if (isNaN(cycId)) throw new AppError('cycId query param required', 400);
    const nominations = await getNominationsForReview(cycId);
    res.json({ data: nominations });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// PATCH /api/top-performers/anonymization/:nominationId/approve
router.patch('/:nominationId/approve', requirePermission('TopPerformers_Admin', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dsUserId = req.user?.dsUserId;
    const email = req.user?.email;
    if (!dsUserId || !email) throw new AppError('Unauthenticated', 401);
    const id = parseInt(req.params['nominationId'] ?? '', 10);
    if (isNaN(id)) throw new AppError('Invalid nomination ID', 400);
    const body = req.body as { editedText?: string };
    await approveAnonymization(id, body.editedText !== undefined ? body.editedText : null, dsUserId, email);
    res.json({ data: { nomId: id, status: 'APPROVED' } });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
