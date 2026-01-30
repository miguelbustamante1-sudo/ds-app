import express from 'express';
import type { Request, Response } from 'express';
import type { ProjectAssignment } from '@prisma/client';
import {
  getAllTeamMemberProjects,
  getTeamMemberProjectById,
  getTeamMemberProjectsByTeamMember,
  getTeamMemberProjectsByProject,
  createTeamMemberProject,
  updateTeamMemberProject,
  deleteTeamMemberProject,
} from '../db/teamMemberProjects';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /team-member-projects
router.get('/', requirePermission('ProjectAssignments', 'read'), async (req: Request, res: Response) => {
  try {
    const items: ProjectAssignment[] = await getAllTeamMemberProjects();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team member projects' });
  }
});

// GET /team-member-projects/team-member/:tms_id
router.get('/team-member/:tms_id', requirePermission('ProjectAssignments', 'read'), async (req: Request, res: Response) => {
  try {
    const tmsId = Number(req.params.tms_id);
    if (Number.isNaN(tmsId)) return res.status(400).json({ error: 'Invalid team member id' });

    const items = await getTeamMemberProjectsByTeamMember(tmsId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team member projects' });
  }
});

// GET /team-member-projects/project/:pro_id
router.get('/project/:pro_id', requirePermission('ProjectAssignments', 'read'), async (req: Request, res: Response) => {
  try {
    const proId = Number(req.params.pro_id);
    if (Number.isNaN(proId)) return res.status(400).json({ error: 'Invalid project id' });

    const items = await getTeamMemberProjectsByProject(proId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team member projects by project' });
  }
});

// GET /team-member-projects/:id
router.get('/:id', requirePermission('ProjectAssignments', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const item = await getTeamMemberProjectById(id);
    if (!item) return res.status(404).json({ error: 'Team member project not found' });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team member project' });
  }
});

// POST /team-member-projects
router.post('/', requirePermission('ProjectAssignments', 'create'), async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<ProjectAssignment>;
    // Basic validation
    if (!body.projectAssignmentStartDate)
      return res.status(400).json({ error: 'projectAssignmentStartDate is required' });

    const created = await createTeamMemberProject(body as Omit<ProjectAssignment, 'txp_id'>);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create team member project' });
  }
});

// PUT /team-member-projects/:id
router.put('/:id', requirePermission('ProjectAssignments', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const body = req.body as Partial<ProjectAssignment>;
    const updated = await updateTeamMemberProject(id, body);
    if (!updated) return res.status(404).json({ error: 'Team member project not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team member project' });
  }
});

// DELETE /team-member-projects/:id
router.delete('/:id', requirePermission('ProjectAssignments', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteTeamMemberProject(id);

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team member project' });
  }
});

export default router;
