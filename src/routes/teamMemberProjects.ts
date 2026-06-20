import express from 'express';
import type { Response } from 'express';
import type { ProjectAssignment } from '@prisma/client';
import type { ProjectAssignmentWithDetailsDTO, BulkRemoveAssignmentsDTO, BulkChangeRateDTO } from '@shared/dto';
import { error } from '../logger';
import {
  getAllTeamMemberProjects,
  getTeamMemberProjectById,
  getTeamMemberProjectsByTeamMember,
  getTeamMemberProjectsByProject,
  createTeamMemberProject,
  updateTeamMemberProject,
  deleteTeamMemberProject,
  closeAndCreateAssignment,
  getBenchAvailableMembers,
  bulkRemoveAssignments,
  bulkChangeRate,
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
    error(err);
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
      projectAssignmentDeleted: item.projectAssignmentDeleted ?? false,
      clientContactId: item.clientContactId ?? null,
      onCallRate: item.onCallRate ? Number(item.onCallRate) : null,
      shiftId: item.shiftId ?? null,
      teamMemberName: item.teamMember
        ? `${item.teamMember.teamMemberNames} ${item.teamMember.teamMemberSurnames}`
        : null,
      teamMemberSeniority: item.teamMember?.teamMemberSeniority ?? null,
      projectName: item.project?.projectName ?? null,
      clientContactName: item.clientContact?.name ?? null,
      clientName: item.project?.client?.Name ?? null,
      clientContacts: item.project?.client?.contacts.map((c) => ({ id: c.id, name: c.name })) ?? [],
    }));
    res.json(dtos);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch team member projects' });
  }
});

// GET /team-member-projects/team-member/:tms_id?active=true
router.get('/team-member/:tms_id', requirePermission('ProjectAssignments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tmsId = Number(req.params.tms_id);
    if (Number.isNaN(tmsId)) return res.status(400).json({ error: 'Invalid team member id' });

    const active = req.query.active === 'true' ? true : undefined;
    const items = await getTeamMemberProjectsByTeamMember(tmsId, active);
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
      projectAssignmentDeleted: item.projectAssignmentDeleted ?? false,
      clientContactId: item.clientContactId ?? null,
      onCallRate: item.onCallRate ? Number(item.onCallRate) : null,
      shiftId: item.shiftId ?? null,
      teamMemberName: null,
      teamMemberSeniority: null,
      projectName: item.project?.projectName ?? null,
      clientContactName: item.clientContact?.name ?? null,
      clientName: item.project?.client?.Name ?? null,
      clientContacts: item.project?.client?.contacts.map((c) => ({ id: c.id, name: c.name })) ?? [],
    }));
    res.json(dtos);
  } catch (err) {
    error(err);
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
      projectAssignmentDeleted: item.projectAssignmentDeleted ?? false,
      clientContactId: item.clientContactId ?? null,
      onCallRate: item.onCallRate ? Number(item.onCallRate) : null,
      shiftId: item.shiftId ?? null,
      teamMemberName: item.teamMember
        ? `${item.teamMember.teamMemberNames} ${item.teamMember.teamMemberSurnames}`
        : null,
      teamMemberSeniority: item.teamMember?.teamMemberSeniority ?? null,
      projectName: null,
      clientContactName: item.clientContact?.name ?? null,
      clientName: null,
      clientContacts: [],
    }));
    res.json(dtos);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch team member projects by project' });
  }
});

// GET /team-member-projects/bench-available
router.get('/bench-available', requirePermission('ProjectAssignments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const members = await getBenchAvailableMembers();
    res.json({ data: members });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch bench-available members' });
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
    error(err);
    res.status(500).json({ error: 'Failed to fetch team member project' });
  }
});

// POST /team-member-projects/bulk-change-rate
router.post('/bulk-change-rate', requirePermission('ProjectAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentIds, newBillRate, newBillRateCurrency, newOnCallRate, startDate } = req.body as BulkChangeRateDTO;

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return res.status(400).json({ error: 'assignmentIds must be a non-empty array' });
    }
    if (newBillRate === undefined || !newBillRateCurrency || !startDate) {
      return res.status(400).json({ error: 'newBillRate, newBillRateCurrency and startDate are required' });
    }

    const startDateObj = new Date(startDate);
    const dsUserId = req.user?.dsUserId ?? null;

    const pairs = await bulkChangeRate(assignmentIds, newBillRate, newBillRateCurrency, newOnCallRate ?? null, startDateObj, dsUserId);

    for (const { closed, created } of pairs) {
      await auditOrchestrator.log({
        entityName: 'tmp_team_member_project',
        entityId: String(closed.projectAssignmentId),
        createdBy: req.user!.email,
        oldValues: closed,
        newValues: { ...closed, projectAssignmentEndDate: closed.projectAssignmentEndDate },
        comment: 'Bulk rate change: assignment closed',
      });
      await auditOrchestrator.log({
        entityName: 'tmp_team_member_project',
        entityId: String(created.projectAssignmentId),
        createdBy: req.user!.email,
        oldValues: null,
        newValues: created,
        comment: 'Bulk rate change: new assignment created',
      });
    }

    res.status(201).json({ data: pairs });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to bulk change bill rate' });
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

    const validation = await validateAssignment(validationInput);
    if (!validation.valid) {
      const firstMessage = validation.errors[0]?.message ?? 'Validation failed';
      return res.status(400).json({ error: firstMessage, errors: validation.errors });
    }

    if (!body.shiftId) {
      return res.status(400).json({ error: 'shiftId is required' });
    }

    if (!body.shiftId) {
      return res.status(400).json({ error: 'shiftId is required' });
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
    error(err);
    res.status(500).json({ error: 'Failed to create team member project' });
  }
});

// PUT /team-member-projects/:id
router.put('/:id', requirePermission('ProjectAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const body = req.body as Partial<ProjectAssignment>;

    const before = await getTeamMemberProjectById(id);
    if (!before) return res.status(404).json({ error: 'Team member project not found' });

    if (body.projectAssignmentAllocation !== undefined) {
      const validationInput: AssignmentValidationInput = {
        teamMemberId: body.teamMemberId ?? before.teamMemberId,
        projectId: body.projectId ?? before.projectId,
        projectAssignmentStartDate: body.projectAssignmentStartDate ?? before.projectAssignmentStartDate,
        projectAssignmentEndDate: body.projectAssignmentEndDate !== undefined ? body.projectAssignmentEndDate : before.projectAssignmentEndDate,
        projectAssignmentBillRate: body.projectAssignmentBillRate !== undefined ? (body.projectAssignmentBillRate ? Number(body.projectAssignmentBillRate) : null) : Number(before.projectAssignmentBillRate),
        projectAssignmentAllocation: Number(body.projectAssignmentAllocation),
        excludeAssignmentId: id,
        excludeProjectId: before.projectId ?? undefined,
      };
      const validation = await validateAssignment(validationInput);
      if (!validation.valid) {
        const firstMessage = validation.errors[0]?.message ?? 'Validation failed';
        return res.status(400).json({ error: firstMessage, errors: validation.errors });
      }
    }

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
    error(err);
    res.status(500).json({ error: 'Failed to update team member project' });
  }
});

// PATCH /team-member-projects/:id/change-rate — atomic close + new record in a single transaction
router.patch('/:id/change-rate', requirePermission('ProjectAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { newStartDate, newBillRate, newCurrency, newOnCallRate } = req.body as {
      newStartDate?: string;
      newBillRate?: number;
      newCurrency?: string;
      newOnCallRate?: number | null;
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
      onCallRate: newOnCallRate !== undefined ? newOnCallRate : currentAssignment.onCallRate,
      shiftId: currentAssignment.shiftId ?? null,
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
    error(err);
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
    error(err);
    res.status(500).json({ error: 'Failed to update team member project' });
  }
});

// DELETE /team-member-projects/bulk
router.delete('/bulk', requirePermission('ProjectAssignments', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentIds, lastBillableDate } = req.body as BulkRemoveAssignmentsDTO;

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return res.status(400).json({ error: 'assignmentIds must be a non-empty array' });
    }
    if (!lastBillableDate) {
      return res.status(400).json({ error: 'lastBillableDate is required' });
    }

    const lastBillableDateObj = new Date(lastBillableDate);
    const dsUserId = req.user?.dsUserId ?? null;

    const before = await Promise.all(
      assignmentIds.map((id) => getTeamMemberProjectById(id)),
    );

    await bulkRemoveAssignments(assignmentIds, lastBillableDateObj, dsUserId);

    for (const record of before) {
      if (!record) continue;
      await auditOrchestrator.log({
        entityName: 'tmp_team_member_project',
        entityId: String(record.projectAssignmentId),
        createdBy: req.user!.email,
        oldValues: record,
        newValues: null,
        comment: 'Bulk removal: assignment end date set',
      });
    }

    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to bulk remove assignments' });
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
    error(err);
    res.status(500).json({ error: 'Failed to delete team member project' });
  }
});

export default router;
