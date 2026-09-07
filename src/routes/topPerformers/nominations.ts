import { Router, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from '../../middleware/auth';
import { AppError } from '../../errors/AppError';
import {
  createPeerNomination,
  createAdminNomination,
  createCustomerNomination,
  type PeerNominationInput,
  type AdminNominationInput,
  type CustomerNominationInput,
} from '../../services/topPerformers/nominations/nominationService';
import {
  getNominationsByCycle,
  getNominationsAdminView,
} from '../../services/topPerformers/nominations/nominationQueries';

const router = Router();

// GET /api/top-performers/nominations?cycId=X
router.get('/', requirePermission('TopPerformers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycId = parseInt(req.query.cycId as string, 10);
    if (isNaN(cycId)) throw new AppError('cycId query param required', 400);
    const nominations = await getNominationsByCycle(cycId);
    res.json({ data: nominations });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// GET /api/top-performers/nominations/admin-view?cycId=X
router.get('/admin-view', requirePermission('TopPerformers_Admin', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycId = parseInt(req.query.cycId as string, 10);
    if (isNaN(cycId)) throw new AppError('cycId query param required', 400);
    const nominations = await getNominationsAdminView(cycId);
    res.json({ data: nominations });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/top-performers/nominations/peer
router.post('/peer', requirePermission('TopPerformers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId || !req.user?.teamMemberId || !req.user?.email) throw new AppError('Unauthenticated', 401);
    const body = req.body as Omit<PeerNominationInput, 'nominatorId' | 'createdBy' | 'userEmail'>;
    const nomination = await createPeerNomination({
      ...body,
      nominatorId: req.user.teamMemberId,
      createdBy: req.user.dsUserId,
      userEmail: req.user.email,
    });
    res.status(201).json({ data: nomination });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/top-performers/nominations/admin
router.post('/admin', requirePermission('TopPerformers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId || !req.user?.teamMemberId || !req.user?.email) throw new AppError('Unauthenticated', 401);
    const body = req.body as Omit<AdminNominationInput, 'nominatorId' | 'createdBy' | 'userEmail'>;
    const nomination = await createAdminNomination({
      ...body,
      nominatorId: req.user.teamMemberId,
      createdBy: req.user.dsUserId,
      userEmail: req.user.email,
    });
    res.status(201).json({ data: nomination });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// POST /api/top-performers/nominations/customer
router.post('/customer', requirePermission('TopPerformers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId || !req.user?.teamMemberId || !req.user?.email) throw new AppError('Unauthenticated', 401);
    const body = req.body as Omit<CustomerNominationInput, 'nominatorId' | 'createdBy' | 'userEmail'>;
    const nomination = await createCustomerNomination({
      ...body,
      nominatorId: req.user.teamMemberId,
      createdBy: req.user.dsUserId,
      userEmail: req.user.email,
    });
    res.status(201).json({ data: nomination });
  } catch (err: unknown) {
    if (err instanceof AppError) { res.status(err.statusCode).json({ error: err.message }); return; }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
