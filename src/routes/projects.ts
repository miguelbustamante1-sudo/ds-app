import express from 'express';
import type { Request, Response } from 'express';
import type { Project } from '@prisma/client';
import type { CreateProjectDTO, UpdateProjectDTO } from '@shared/dto';
import { getAllProjects, getProjectById, createProject, updateProject, deleteProject } from '../db/projects';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /projects
router.get('/', requirePermission('Projects', 'read'), async (req: Request, res: Response) => {
  try {
    const projects: Project[] = await getAllProjects();
    res.json(projects);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /projects/:id
router.get('/:id', requirePermission('Projects', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const project = await getProjectById(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json(project);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /projects
router.post('/', requirePermission('Projects', 'create'), async (req: Request, res: Response) => {
  try {
    const { projectName, projectExternalId, projectSow } = req.body as CreateProjectDTO;

    const project = await createProject(projectName ?? null, projectExternalId ?? null, projectSow ?? null);
    res.status(201).json(project);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /projects/:id
router.put('/:id', requirePermission('Projects', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { projectName, projectExternalId, projectSow } = req.body as UpdateProjectDTO;

    const project = await updateProject(id, projectName ?? null, projectExternalId ?? null, projectSow ?? null);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json(project);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /projects/:id
router.delete('/:id', requirePermission('Projects', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteProject(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
