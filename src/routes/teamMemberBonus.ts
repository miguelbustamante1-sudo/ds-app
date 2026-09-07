import express from 'express';
import type { Response } from 'express';
import { teamMemberBonusOrchestrator } from '../services/teamMemberBonus';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type {
  CreateTeamMemberBonusDTO,
  UpdateTeamMemberBonusDTO,
} from '@shared/dto/TeamMemberBonus';

const router = express.Router();

function catchBlock(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// GET /team-member-bonuses
router.get('/', requirePermission('TeamMemberBonuses', 'read'), async (_req, res: Response) => {
  try {
    const items = await teamMemberBonusOrchestrator.getAll();
    res.json({ data: items });
  } catch (err) {
    catchBlock(err, res);
  }
});

// GET /team-member-bonuses/:id
router.get('/:id', requirePermission('TeamMemberBonuses', 'read'), async (req, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    const item = await teamMemberBonusOrchestrator.getById(id);
    res.json({ data: item });
  } catch (err) {
    catchBlock(err, res);
  }
});

// POST /team-member-bonuses
router.post('/', requirePermission('TeamMemberBonuses', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const body = req.body as CreateTeamMemberBonusDTO;
    if (!body.teamMemberId)    { res.status(400).json({ error: 'teamMemberId is required' });    return; }
    if (!body.bonusCategoryId) { res.status(400).json({ error: 'bonusCategoryId is required' }); return; }
    if (body.bonusAmount === undefined || body.bonusAmount === null) {
      res.status(400).json({ error: 'bonusAmount is required' }); return;
    }
    if (!body.bonusPeriodicity) { res.status(400).json({ error: 'bonusPeriodicity is required' }); return; }

    const created = await teamMemberBonusOrchestrator.create(body, req.user.email, req.user.dsUserId);
    res.status(201).json({ data: created });
  } catch (err) {
    catchBlock(err, res);
  }
});

// PUT /team-member-bonuses/:id
router.put('/:id', requirePermission('TeamMemberBonuses', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const body = req.body as UpdateTeamMemberBonusDTO;
    const updated = await teamMemberBonusOrchestrator.update(id, body, req.user.email, req.user.dsUserId);
    res.json({ data: updated });
  } catch (err) {
    catchBlock(err, res);
  }
});

// DELETE /team-member-bonuses/:id
router.delete('/:id', requirePermission('TeamMemberBonuses', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    await teamMemberBonusOrchestrator.delete(id, req.user.email, req.user.dsUserId);
    res.status(204).send();
  } catch (err) {
    catchBlock(err, res);
  }
});

export default router;
