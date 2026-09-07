import express from 'express';
import type { Response } from 'express';
import { teamMemberOncallOrchestrator } from '../services/teamMemberOncall';
import { requirePermission } from '../middleware/auth';
import { validateApiKey } from '../middleware/apiKey';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type {
  CreateTeamMemberOncallDTO,
  UpdateTeamMemberOncallDTO,
  BulkDeleteTeamMemberOncallDTO,
} from '@shared/dto/TeamMemberOncall';
import type { SubmitTeamMemberOncallExternalEntriesDTO } from '@shared/dto/TeamMemberOncallExternalIntake';

const router = express.Router();

function catchBlock(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// GET /team-member-oncall
router.get('/', requirePermission('PayrolManagement', 'read'), async (_req, res: Response) => {
  try {
    const items = await teamMemberOncallOrchestrator.getAll();
    res.json({ data: items });
  } catch (err) {
    catchBlock(err, res);
  }
});

// GET /team-member-oncall/:id
router.get('/:id', requirePermission('PayrolManagement', 'read'), async (req, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    const item = await teamMemberOncallOrchestrator.getById(id);
    res.json({ data: item });
  } catch (err) {
    catchBlock(err, res);
  }
});

// POST /team-member-oncall
router.post('/', requirePermission('PayrolManagement', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const body = req.body as CreateTeamMemberOncallDTO;
    if (!body.teamMemberId) { res.status(400).json({ error: 'teamMemberId is required' }); return; }
    if (body.oncallAmount === undefined || body.oncallAmount === null) {
      res.status(400).json({ error: 'oncallAmount is required' }); return;
    }
    if (!body.oncallDate) { res.status(400).json({ error: 'oncallDate is required' }); return; }

    const created = await teamMemberOncallOrchestrator.create(body, req.user.email, req.user.dsUserId);
    res.status(201).json({ data: created });
  } catch (err) {
    catchBlock(err, res);
  }
});

// POST /team-member-oncall/external
router.post(
  '/external',
  validateApiKey,
  requirePermission('TeamMemberOncallExternalIntake', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);

      const body = req.body as SubmitTeamMemberOncallExternalEntriesDTO;
      if (!Array.isArray(body.entries) || body.entries.length === 0) {
        throw new AppError('entries must be a non-empty array', 400);
      }

      const result = await teamMemberOncallOrchestrator.submitExternalIntake(
        body.entries,
        req.user.email,
        req.user.dsUserId,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// POST /team-member-oncall/import
router.post(
  '/import',
  requirePermission('PayrolManagement', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);

      const body = req.body as SubmitTeamMemberOncallExternalEntriesDTO;
      if (!Array.isArray(body.entries) || body.entries.length === 0) {
        throw new AppError('entries must be a non-empty array', 400);
      }

      const result = await teamMemberOncallOrchestrator.submitExternalIntake(
        body.entries,
        req.user.email,
        req.user.dsUserId,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// POST /team-member-oncall/bulk-delete
router.post(
  '/bulk-delete',
  requirePermission('PayrolManagement', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);

      const body = req.body as BulkDeleteTeamMemberOncallDTO;
      if (!Array.isArray(body.oncallIds) || body.oncallIds.length === 0) {
        throw new AppError('oncallIds must be a non-empty array', 400);
      }

      await teamMemberOncallOrchestrator.bulkDelete(body.oncallIds, req.user.email);
      res.status(204).send();
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// PUT /team-member-oncall/:id
router.put('/:id', requirePermission('PayrolManagement', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const body = req.body as UpdateTeamMemberOncallDTO;
    const updated = await teamMemberOncallOrchestrator.update(id, body, req.user.email, req.user.dsUserId);
    res.json({ data: updated });
  } catch (err) {
    catchBlock(err, res);
  }
});

// DELETE /team-member-oncall/:id
router.delete('/:id', requirePermission('PayrolManagement', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    await teamMemberOncallOrchestrator.delete(id, req.user.email, req.user.dsUserId);
    res.status(204).send();
  } catch (err) {
    catchBlock(err, res);
  }
});

export default router;
