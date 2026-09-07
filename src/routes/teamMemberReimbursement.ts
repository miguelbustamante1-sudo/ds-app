import express from 'express';
import type { Response } from 'express';
import { teamMemberReimbursementOrchestrator } from '../services/teamMemberReimbursement';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type {
  CreateTeamMemberReimbursementDTO,
  UpdateTeamMemberReimbursementDTO,
} from '@shared/dto/TeamMemberReimbursement';

const router = express.Router();

function catchBlock(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// GET /team-member-reimbursements
router.get('/', requirePermission('PayrolManagement', 'read'), async (_req, res: Response) => {
  try {
    const items = await teamMemberReimbursementOrchestrator.getAll();
    res.json({ data: items });
  } catch (err) {
    catchBlock(err, res);
  }
});

// GET /team-member-reimbursements/:id
router.get('/:id', requirePermission('PayrolManagement', 'read'), async (req, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    const item = await teamMemberReimbursementOrchestrator.getById(id);
    res.json({ data: item });
  } catch (err) {
    catchBlock(err, res);
  }
});

// POST /team-member-reimbursements
router.post('/', requirePermission('PayrolManagement', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const body = req.body as CreateTeamMemberReimbursementDTO;
    if (!body.teamMemberId) { res.status(400).json({ error: 'teamMemberId is required' }); return; }
    if (body.reimbursementAmount === undefined || body.reimbursementAmount === null) {
      res.status(400).json({ error: 'reimbursementAmount is required' }); return;
    }
    if (!body.reimbursementDate) { res.status(400).json({ error: 'reimbursementDate is required' }); return; }

    const created = await teamMemberReimbursementOrchestrator.create(body, req.user.email, req.user.dsUserId);
    res.status(201).json({ data: created });
  } catch (err) {
    catchBlock(err, res);
  }
});

// PUT /team-member-reimbursements/:id
router.put('/:id', requirePermission('PayrolManagement', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const body = req.body as UpdateTeamMemberReimbursementDTO;
    const updated = await teamMemberReimbursementOrchestrator.update(id, body, req.user.email, req.user.dsUserId);
    res.json({ data: updated });
  } catch (err) {
    catchBlock(err, res);
  }
});

// DELETE /team-member-reimbursements/:id
router.delete('/:id', requirePermission('PayrolManagement', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    await teamMemberReimbursementOrchestrator.delete(id, req.user.email, req.user.dsUserId);
    res.status(204).send();
  } catch (err) {
    catchBlock(err, res);
  }
});

export default router;
