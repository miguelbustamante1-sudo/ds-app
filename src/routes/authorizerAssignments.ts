import express from 'express';
import type { Response } from 'express';
import {
  authorizerAssignmentOrchestrator,
  SelfAssignmentError,
} from '../services/authorizerAssignment';
import { getTeamMemberById } from '../db/teamMembers';
import { requirePermission, requireRole } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type {
  CreateAuthorizerAssignmentDTO,
  UpdateAuthorizerAssignmentDTO,
} from '@shared/dto/AuthorizerAssignment';

const router = express.Router();

function catchBlock(err: unknown, res: Response): void {
  if (err instanceof SelfAssignmentError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// GET /authorizer-assignments
router.get(
  '/',
  requirePermission('PayrollAdmin', 'read'),
  requireRole('bsa'),
  async (_req, res: Response) => {
    try {
      const items = await authorizerAssignmentOrchestrator.getAll();
      res.json({ data: items });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// GET /authorizer-assignments/team-member/:teamMemberId — public param stays the
// internal id for API stability; txa_authorizer_assignment itself now keys on wdid,
// so the id is translated to the team member's Workday ID before querying.
router.get(
  '/team-member/:teamMemberId',
  requirePermission('PayrollAdmin', 'read'),
  requireRole('bsa'),
  async (req, res: Response) => {
    try {
      const teamMemberId = Number(req.params.teamMemberId);
      if (Number.isNaN(teamMemberId)) {
        res.status(400).json({ error: 'Invalid team member id' });
        return;
      }
      const teamMember = await getTeamMemberById(teamMemberId);
      if (!teamMember?.workdayId) {
        res.status(404).json({ error: 'Team member not found or has no Workday ID' });
        return;
      }
      const items = await authorizerAssignmentOrchestrator.getByTeamMember(teamMember.workdayId);
      res.json({ data: items });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// GET /authorizer-assignments/:id
router.get(
  '/:id',
  requirePermission('PayrollAdmin', 'read'),
  requireRole('bsa'),
  async (req, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const item = await authorizerAssignmentOrchestrator.getById(id);
      if (!item) {
        res.status(404).json({ error: 'Authorizer assignment not found' });
        return;
      }
      res.json({ data: item });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// POST /authorizer-assignments
router.post(
  '/',
  requirePermission('PayrollAdmin', 'create'),
  requireRole('bsa'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);

      const body = req.body as CreateAuthorizerAssignmentDTO;
      if (!body.teamMemberWdid) {
        res.status(400).json({ error: 'teamMemberWdid is required' });
        return;
      }
      if (!body.authorizerWdid) {
        res.status(400).json({ error: 'authorizerWdid is required' });
        return;
      }
      if (!body.authorizerAssignmentStartDate) {
        res.status(400).json({ error: 'authorizerAssignmentStartDate is required' });
        return;
      }

      const created = await authorizerAssignmentOrchestrator.create(body, req.user.email, req.user.dsUserId);
      res.status(201).json({ data: created });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// PUT /authorizer-assignments/:id
router.put(
  '/:id',
  requirePermission('PayrollAdmin', 'create'),
  requireRole('bsa'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      const body = req.body as UpdateAuthorizerAssignmentDTO;
      const updated = await authorizerAssignmentOrchestrator.update(id, body, req.user.email, req.user.dsUserId);
      if (!updated) {
        res.status(404).json({ error: 'Authorizer assignment not found' });
        return;
      }
      res.json({ data: updated });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// DELETE /authorizer-assignments/:id
router.delete(
  '/:id',
  requirePermission('PayrollAdmin', 'delete'),
  requireRole('bsa'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.email) throw new AppError('Unauthenticated', 401);
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const deleted = await authorizerAssignmentOrchestrator.delete(id, req.user.email);
      if (!deleted) {
        res.status(404).json({ error: 'Authorizer assignment not found' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

export default router;
