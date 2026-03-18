import express from 'express';
import type { Response } from 'express';
import type { CreateProjectDTO, UpdateProjectDTO } from '@shared/dto';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../db/projects';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';

const router = express.Router();

function toProjectDTO(project: Awaited<ReturnType<typeof getProjectById>>) {
  if (!project) return null;
  return {
    ...project,
    clientName: project.client?.Name ?? null,
    client: undefined,
  };
}

// GET /projects
router.get('/', requirePermission('Projects', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const projects = await getAllProjects(clientId);
    res.json(projects.map(toProjectDTO));
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /projects/:id
router.get('/:id', requirePermission('Projects', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const project = await getProjectById(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json(toProjectDTO(project));
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /projects
router.post('/', requirePermission('Projects', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdBy = req.user?.email ?? 'unknown';
    const {
      projectName,
      projectExternalId,
      projectSow,
      projectStartDate,
      projectEndDate,
      projectActive,
      clientId,
    } = req.body as CreateProjectDTO;

    const project = await createProject({
      projectName: projectName ?? null,
      projectExternalId: projectExternalId ?? null,
      projectSow: projectSow ?? null,
      projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
      projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
      projectActive: projectActive ?? true,
      projectCreatedAt: new Date(),
      projectCreatedBy: createdBy,
      clientId: clientId ?? null,
    });

    await auditOrchestrator.log({
      entityName: 'pro_projects',
      entityId: String(project.projectId),
      createdBy,
      oldValues: null,
      newValues: project,
      comment: `Project "${project.projectName}" created`,
    });

    res.status(201).json(toProjectDTO(project));
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /projects/:id
router.put('/:id', requirePermission('Projects', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const updatedBy = req.user?.email ?? 'unknown';
    const {
      projectName,
      projectExternalId,
      projectSow,
      projectStartDate,
      projectEndDate,
      projectActive,
      clientId,
    } = req.body as UpdateProjectDTO;

    const before = await getProjectById(id);
    if (!before) return res.status(404).json({ error: 'Project not found' });

    const project = await updateProject(id, {
      projectName: projectName ?? null,
      projectExternalId: projectExternalId ?? null,
      projectSow: projectSow ?? null,
      projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
      projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
      projectActive: projectActive ?? null,
      ...(clientId !== undefined ? { clientId } : {}),
    });

    await auditOrchestrator.log({
      entityName: 'pro_projects',
      entityId: String(id),
      createdBy: updatedBy,
      oldValues: before,
      newValues: project,
      comment: `Project "${project?.projectName}" updated`,
    });

    res.json(toProjectDTO(project));
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /projects/:id
router.delete('/:id', requirePermission('Projects', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const deletedBy = req.user?.email ?? 'unknown';

    const before = await getProjectById(id);
    if (!before) return res.status(404).json({ error: 'Project not found' });

    await deleteProject(id);

    await auditOrchestrator.log({
      entityName: 'pro_projects',
      entityId: String(id),
      createdBy: deletedBy,
      oldValues: before,
      newValues: null,
      comment: `Project "${before.projectName}" deleted`,
    });

    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
