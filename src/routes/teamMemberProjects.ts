import express from 'express';
import type { Response } from 'express';
import type { ProjectAssignment } from '@prisma/client';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';
import {
  getAllTeamMemberProjects,
  getTeamMemberProjectById,
  getTeamMemberProjectsByTeamMember,
  getTeamMemberProjectsByProject,
  createTeamMemberProject,
  updateTeamMemberProject,
  deleteTeamMemberProject,
} from '../db/teamMemberProjects';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { getActiveProjects } from '../services/projectAssignment/queries/getActiveProjects';
import { validateAssignment } from '../services/projectAssignment/validation';
import type { AssignmentValidationInput } from '../services/projectAssignment/validation';

const router = express.Router();

// GET /team-member-projects/active-projects?q=searchTerm
router.get('/active-projects', requirePermission('ProjectAssignments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const projects = await getActiveProjects(q);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active projects' });
  }
});

// GET /team-member-projects
router.get('/', requirePermission('ProjectAssignments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await getAllTeamMemberProjects();
    const dtos: ProjectAssignmentWithDetailsDTO[] = items.map((item) => ({
      projectAssignmentId: item.projectAssignmentId,
      teamMemberId: item.teamMemberId,
      projectId: item.projectId,
      projectAssignmentStartDate: item.projectAssignmentStartDate,
      projectAssignmentEndDate: item.projectAssignmentEndDate,
      projectAssignmentBillRate: item.projectAssignmentBillRate ? Number(item.projectAssignmentBillRate) : null,
      projectAssignmentBillRateCurrency: item.projectAssignmentBillRateCurrency,
      projectAssignmentCreatedBy: item.projectAssignmentCreatedBy,
      projectAssignmentCreatedDate: item.projectAssignmentCreatedDate,
      projectAssignmentLastUpdatedBy: item.projectAssignmentLastUpdatedBy,
      projectAssignmentLastUpdatedDate: item.projectAssignmentLastUpdatedDate,
      projectAssignmentAllocation: item.projectAssignmentAllocation ? Number(item.projectAssignmentAllocation) : null,
      projectAssignmentDeleted: item.projectAssignmentDeleted,
      teamMemberName: item.teamMember
        ? (item.teamMember.teamMemberKnownAs
            ? `${item.teamMember.teamMemberKnownAs} ${item.teamMember.teamMemberSurnames}`
            : `${item.teamMember.teamMemberNames} ${item.teamMember.teamMemberSurnames}`)
        : null,
      projectName: item.project?.projectName ?? null,
    }));
    res.json(dtos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team member projects' });
  }
});

// GET /team-member-projects/team-member/:tms_id
router.get('/team-member/:tms_id', requirePermission('ProjectAssignments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/project/:pro_id', requirePermission('ProjectAssignments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/:id', requirePermission('ProjectAssignments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
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
router.post('/', requirePermission('ProjectAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as Partial<ProjectAssignment>;

    const validationInput: AssignmentValidationInput = {
      teamMemberId: body.teamMemberId ?? null,
      projectId: body.projectId ?? null,
      projectAssignmentStartDate: body.projectAssignmentStartDate!,
      projectAssignmentEndDate: body.projectAssignmentEndDate ?? null,
      projectAssignmentBillRate: body.projectAssignmentBillRate ? Number(body.projectAssignmentBillRate) : null,
      projectAssignmentAllocation: body.projectAssignmentAllocation ? Number(body.projectAssignmentAllocation) : null,
    };

    const supervisorTeamMemberId = req.user?.teamMemberId;
    if (!supervisorTeamMemberId) {
      return res.status(403).json({ error: 'Current user is not linked to a team member' });
    }

    const validation = await validateAssignment(validationInput, supervisorTeamMemberId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const now = new Date();
    const createData = {
      ...body,
      projectAssignmentStartDate: typeof body.projectAssignmentStartDate === 'string'
        ? new Date(body.projectAssignmentStartDate)
        : body.projectAssignmentStartDate!,
      projectAssignmentEndDate: body.projectAssignmentEndDate
        ? (typeof body.projectAssignmentEndDate === 'string'
            ? new Date(body.projectAssignmentEndDate)
            : body.projectAssignmentEndDate)
        : null,
      projectAssignmentCreatedBy: req.user!.dsUserId ?? null,
      projectAssignmentCreatedDate: now,
      projectAssignmentLastUpdatedBy: req.user!.dsUserId ?? null,
      projectAssignmentLastUpdatedDate: now,
      projectAssignmentDeleted: false,
    };

    const created = await createTeamMemberProject(createData as any);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create team member project' });
  }
});

// PUT /team-member-projects/:id
router.put('/:id', requirePermission('ProjectAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const body = req.body as Partial<ProjectAssignment>;

    const now = new Date();
    const updateData = {
      ...body,
      projectAssignmentLastUpdatedBy: req.user?.dsUserId ?? null,
      projectAssignmentLastUpdatedDate: now,
    };

    if (updateData.projectAssignmentStartDate && typeof updateData.projectAssignmentStartDate === 'string') {
      updateData.projectAssignmentStartDate = new Date(updateData.projectAssignmentStartDate) as any;
    }
    if (updateData.projectAssignmentEndDate && typeof updateData.projectAssignmentEndDate === 'string') {
      updateData.projectAssignmentEndDate = new Date(updateData.projectAssignmentEndDate) as any;
    }

    const updated = await updateTeamMemberProject(id, updateData);
    if (!updated) return res.status(404).json({ error: 'Team member project not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team member project' });
  }
});

// DELETE /team-member-projects/:id
router.delete('/:id', requirePermission('ProjectAssignments', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
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
