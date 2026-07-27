import { Router, Request, Response } from 'express';
import { requirePermission, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { projectAccessOrchestrator } from '../services/projectAccess/ProjectAccessOrchestrator';
import type { CreateProjectGrantDTO } from '@shared/dto';
import { AppError } from '../errors/AppError';
import { error } from '../logger';

const router = Router();

// GET /project-grants/can-modify/:projectId — any authenticated user checks their own modify rights
router.get(
  '/can-modify/:projectId',
  requirePermission('ProjectAssignments', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      if (Number.isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

      const canModify = await projectAccessOrchestrator.canModifyProject(req.user?.teamMemberId, projectId);
      res.json({ data: { canModify } });
    } catch (err) {
      error(err);
      res.status(500).json({ error: 'Failed to check project access' });
    }
  },
);

// GET /project-grants?projectId= — list grants for a project (admin management view)
router.get('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.query.projectId);
    if (Number.isNaN(projectId)) return res.status(400).json({ error: 'projectId query param is required' });

    const grants = await projectAccessOrchestrator.getGrants(projectId);
    res.json({ data: grants });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch project grants' });
  }
});

// POST /project-grants — assign a project to an Operations Manager (or grant view access) — FR-013
router.post('/', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dto = req.body as CreateProjectGrantDTO;
    if (!dto.projectId || !dto.teamMemberId || !dto.access) {
      return res.status(400).json({ error: 'projectId, teamMemberId, and access are required' });
    }

    const dsUserId = req.user?.dsUserId;
    if (dsUserId == null) return res.status(401).json({ error: 'Unauthenticated' });

    const created = await projectAccessOrchestrator.createGrant(dto, dsUserId, req.user!.email);
    res.status(201).json({ data: created });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    error(err);
    res.status(500).json({ error: 'Failed to create project grant' });
  }
});

// DELETE /project-grants/:id
router.delete('/:id', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await projectAccessOrchestrator.deleteGrant(id, req.user!.email);
    res.status(204).send();
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    error(err);
    res.status(500).json({ error: 'Failed to delete project grant' });
  }
});

export default router;
