import { Router, Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { teamManagementOrchestrator } from '../services/teamManagement/TeamManagementOrchestrator';
import { validateIsMyReport } from '../services/teamManagement/components/ValidateIsMyReport';
import { teamMemberChangeRequestOrchestrator } from '../services/teamMemberChangeRequest/TeamMemberChangeRequestOrchestrator';
import type {
  UpdateMyTeamMemberDTO,
  CreateTeamMemberChangeRequestDTO,
  CreateAttritionRequestDTO,
  ReviewTeamMemberChangeRequestDTO,
} from '@shared/dto';
import { AppError } from '../errors/AppError';
import { error } from '../logger';

const router = Router();

function requireIdentity(req: AuthenticatedRequest): { teamMemberId: number; dsUserId: number; email: string } {
  const user = req.user;
  if (!user) {
    throw new AppError('Unauthenticated', 401);
  }
  if (user.teamMemberId == null) {
    throw new AppError('Authenticated user has no associated team member record', 403);
  }
  if (user.dsUserId == null) {
    throw new AppError('Unauthenticated', 401);
  }
  return { teamMemberId: user.teamMemberId, dsUserId: user.dsUserId, email: user.email };
}

// GET /team-management/my-team
router.get('/my-team', requirePermission('TeamMembers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamMemberId } = requireIdentity(req);
    const team = await teamManagementOrchestrator.getMyTeam(teamMemberId);
    res.json({ data: team });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    error(err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// PATCH /team-management/members/:id — free edit (no approval)
router.patch('/members/:id', requirePermission('TeamMembers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { teamMemberId, dsUserId, email } = requireIdentity(req);
    const dto = req.body as UpdateMyTeamMemberDTO;

    await teamManagementOrchestrator.updateFreeEditFields(id, teamMemberId, dto, dsUserId, email);
    const team = await teamManagementOrchestrator.getMyTeam(teamMemberId);
    const updated = team.find((m) => m.teamMemberId === id);
    res.json({ data: updated ?? null });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    error(err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// POST /team-management/members/:id/change-requests — approval-required edit (FR-011)
router.post(
  '/members/:id/change-requests',
  requirePermission('TeamMembers', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

      const { teamMemberId, dsUserId, email } = requireIdentity(req);
      await validateIsMyReport(teamMemberId, id);

      const dto = req.body as CreateTeamMemberChangeRequestDTO;
      const created = await teamMemberChangeRequestOrchestrator.createEditRequest(id, dto, dsUserId, email);
      res.status(201).json({ data: created });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to submit change request' });
    }
  },
);

// POST /team-management/members/:id/attrition (Q-005 — dedicated attrition action)
router.post(
  '/members/:id/attrition',
  requirePermission('TeamMembers', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

      const { teamMemberId, dsUserId, email } = requireIdentity(req);
      await validateIsMyReport(teamMemberId, id);

      const dto = req.body as CreateAttritionRequestDTO;
      if (!dto.teamMemberEndDate) {
        return res.status(400).json({ error: 'teamMemberEndDate is required' });
      }

      const created = await teamMemberChangeRequestOrchestrator.createAttritionRequest(id, dto, dsUserId, email);
      res.status(201).json({ data: created });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to submit attrition request' });
    }
  },
);

// GET /team-management/change-requests/pending — OM approval inbox
router.get(
  '/change-requests/pending',
  requirePermission('TeamMembers', 'create'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const pending = await teamMemberChangeRequestOrchestrator.getPending();
      res.json({ data: pending });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to fetch pending change requests' });
    }
  },
);

// PATCH /team-management/change-requests/:id/approve
router.patch(
  '/change-requests/:id/approve',
  requirePermission('TeamMembers', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

      const { dsUserId, email } = requireIdentity(req);
      const dto = req.body as ReviewTeamMemberChangeRequestDTO;
      const updated = await teamMemberChangeRequestOrchestrator.approve(id, dsUserId, email, dto.comment ?? null);
      res.json({ data: updated });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to approve change request' });
    }
  },
);

// PATCH /team-management/change-requests/:id/reject
router.patch(
  '/change-requests/:id/reject',
  requirePermission('TeamMembers', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

      const { dsUserId, email } = requireIdentity(req);
      const dto = req.body as ReviewTeamMemberChangeRequestDTO;
      const updated = await teamMemberChangeRequestOrchestrator.reject(id, dsUserId, email, dto.comment ?? null);
      res.json({ data: updated });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      error(err);
      res.status(500).json({ error: 'Failed to reject change request' });
    }
  },
);

export default router;
