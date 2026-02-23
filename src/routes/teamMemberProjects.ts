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
  closeAndCreateAssignment,
} from '../db/teamMemberProjects';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
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
      teamMemberSeniority: item.teamMember?.teamMemberSeniority ?? null,
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
      teamMemberSeniority: item.teamMember?.teamMemberSeniority ?? null,
      projectName: null,
    }));
    res.json(dtos);
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

    await auditOrchestrator.log({
      entityName: 'tmp_team_member_project',
      entityId: String(created.projectAssignmentId),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: null,
      newValues: created,
      comment: 'Project assignment created',
    });

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

    const before = await getTeamMemberProjectById(id);
    if (!before) return res.status(404).json({ error: 'Team member project not found' });

    const updated = await updateTeamMemberProject(id, updateData);
    if (!updated) return res.status(404).json({ error: 'Team member project not found' });

    await auditOrchestrator.log({
      entityName: 'tmp_team_member_project',
      entityId: String(id),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: before,
      newValues: updated,
      comment: 'Project assignment updated',
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team member project' });
  }
});

// PATCH /team-member-projects/:id/change-rate — atomic close + new record in a single transaction
router.patch('/:id/change-rate', requirePermission('ProjectAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { newStartDate, newBillRate, newCurrency } = req.body as {
      newStartDate?: string;
      newBillRate?: number;
      newCurrency?: string;
    };

    if (!newStartDate || newBillRate === undefined || !newCurrency) {
      return res.status(400).json({ error: 'newStartDate, newBillRate and newCurrency are required' });
    }

    const currentAssignment = await getTeamMemberProjectById(id);
    if (!currentAssignment) return res.status(404).json({ error: 'Team member project not found' });

    const startDateObj = new Date(newStartDate);
    if (startDateObj <= new Date(currentAssignment.projectAssignmentStartDate)) {
      return res.status(400).json({ error: 'newStartDate must be strictly after the current assignment start date' });
    }

    const closeEndDate = new Date(startDateObj);
    closeEndDate.setDate(closeEndDate.getDate() - 1);

    const now = new Date();
    const dsUserId = req.user?.dsUserId ?? null;

    const newRecord = {
      teamMemberId: currentAssignment.teamMemberId,
      projectId: currentAssignment.projectId,
      projectAssignmentStartDate: startDateObj,
      projectAssignmentEndDate: currentAssignment.projectAssignmentEndDate,
      projectAssignmentBillRate: newBillRate,
      projectAssignmentBillRateCurrency: newCurrency,
      projectAssignmentAllocation: currentAssignment.projectAssignmentAllocation,
      projectAssignmentCreatedBy: dsUserId,
      projectAssignmentCreatedDate: now,
      projectAssignmentLastUpdatedBy: dsUserId,
      projectAssignmentLastUpdatedDate: now,
      projectAssignmentDeleted: false,
    };

    const { closed, created } = await closeAndCreateAssignment(id, closeEndDate, newRecord, dsUserId, now);

    await auditOrchestrator.log({
      entityName: 'tmp_team_member_project',
      entityId: String(id),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: currentAssignment,
      newValues: closed,
      comment: 'Bill rate change: assignment closed',
    });

    await auditOrchestrator.log({
      entityName: 'tmp_team_member_project',
      entityId: String(created.projectAssignmentId),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: null,
      newValues: created,
      comment: 'Bill rate change: new assignment created',
    });

    res.status(201).json({ closed, created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change bill rate' });
  }
});

// PATCH /team-member-projects/:id — partial update (alias of PUT)
router.patch('/:id', requirePermission('ProjectAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
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

    const before = await getTeamMemberProjectById(id);
    if (!before) return res.status(404).json({ error: 'Team member project not found' });

    const updated = await updateTeamMemberProject(id, updateData);
    if (!updated) return res.status(404).json({ error: 'Team member project not found' });

    await auditOrchestrator.log({
      entityName: 'tmp_team_member_project',
      entityId: String(id),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: before,
      newValues: updated,
      comment: 'Project assignment updated',
    });

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

    const before = await getTeamMemberProjectById(id);
    if (!before) return res.status(404).json({ error: 'Team member project not found' });

    await deleteTeamMemberProject(id);

    await auditOrchestrator.log({
      entityName: 'tmp_team_member_project',
      entityId: String(id),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: before,
      newValues: null,
      comment: 'Project assignment deleted',
    });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team member project' });
  }
});

export default router;
