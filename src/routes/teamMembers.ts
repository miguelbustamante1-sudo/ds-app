import express from 'express';
import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import type { TeamMemberDTO, CreateTeamMemberDTO, UpdateTeamMemberDTO } from '../../shared/dto';
import { getAllTeamMembersWithDetails, getTeamMemberById, getTeamMembersByCountry, getTeamMembersBySupervisor, createTeamMember, updateTeamMember, deleteTeamMember } from '../db/teamMembers';
import { getMyTeamMemberProfile } from '../db/users';
import { getAvailableResources } from '../services/teamMember/queries/getAvailableResources';
import { getReports, getAvailableForProject } from '../services/teamMember';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /team-members
router.get('/', requirePermission('TeamMembers', 'read'), async (_req: Request, res: Response) => {
  try {
    const items = await getAllTeamMembersWithDetails();
    const dtos: TeamMemberDTO[] = items.map(item => ({
      teamMemberId: item.teamMemberId,
      teamMemberNames: item.teamMemberNames,
      teamMemberSurnames: item.teamMemberSurnames,
      teamMemberKnownAs: item.teamMemberKnownAs,
      teamMemberStartDate: item.teamMemberStartDate,
      teamMemberEndDate: item.teamMemberEndDate,
      countryId: item.countryId,
      workdayId: item.workdayId,
      teamMemberSeniority: item.teamMemberSeniority,
      teamMemberPrimaryRole: item.teamMemberPrimaryRole,
      teamMemberCreatedBy: item.teamMemberCreatedBy,
      teamMemberCreatedDate: item.teamMemberCreatedDate,
      teamMemberLastUpdatedBy: item.teamMemberLastUpdatedBy,
      teamMemberLastUpdatedDate: item.teamMemberLastUpdatedDate,
      // Include relation fields
      countryName: item.country?.countryName ?? null,
      roleName: item.primaryRole?.roleName ?? null,
    }));
    res.json(dtos);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// GET /team-members/country/:cou_id
router.get('/country/:cou_id', requirePermission('TeamMembers', 'read'), async (req: Request, res: Response) => {
  try {
    const couId = Number(req.params.cou_id);
    if (Number.isNaN(couId)) return res.status(400).json({ error: 'Invalid country id' });

    const items = await getTeamMembersByCountry(couId);
    res.json(items);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch team members by country' });
  }
});

// GET /team-members/supervisor/:supervisor_id
router.get('/supervisor/:supervisor_id', requirePermission('TeamMembers', 'read'), async (req: Request, res: Response) => {
  try {
    const supId = Number(req.params.supervisor_id);
    if (Number.isNaN(supId)) return res.status(400).json({ error: 'Invalid supervisor id' });

    const items = await getTeamMembersBySupervisor(supId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team members by supervisor' });
  }
});

// GET /team-members/my-reports?hierarchy=direct|complete
router.get('/my-reports', requirePermission('TeamMembers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const includeFullHierarchy = req.query.hierarchy === 'complete';
    const reports = await getReports(teamMemberId, includeFullHierarchy);
    res.json(reports);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /team-members/me - Get current user's team member profile
router.get('/me', requirePermission('TeamMembers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const profile = await getMyTeamMemberProfile(teamMemberId);
    if (!profile) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    res.json(profile);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch team member profile' });
  }
});

// GET /team-members/available-resources
router.get('/available-resources', requirePermission('TeamMembers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resources = await getAvailableResources();
    res.json(resources);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch available resources' });
  }
});

// GET /team-members/available-under-supervisor?projectId=&q=
router.get('/available-under-supervisor', requirePermission('ProjectAssignments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supervisorId = req.user?.teamMemberId;
    if (!supervisorId) {
      return res.status(403).json({ error: 'Current user is not linked to a team member' });
    }

    const projectId = Number(req.query.projectId);
    if (!req.query.projectId || Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    const resources = await getAvailableForProject(supervisorId, projectId, q);
    res.json(resources);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch available resources under supervisor' });
  }
});

// GET /team-members/:id
router.get('/:id', requirePermission('TeamMembers', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const item = await getTeamMemberById(id);
    if (!item) return res.status(404).json({ error: 'Team member not found' });

    const dto: TeamMemberDTO = item as TeamMemberDTO;
    res.json(dto);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team member' });
  }
});

// POST /team-members
router.post('/', requirePermission('TeamMembers', 'create'), async (req: Request, res: Response) => {
  try {
    const dto = req.body as CreateTeamMemberDTO;

    // Validation
    if (!dto.teamMemberNames || !dto.teamMemberSurnames || !dto.teamMemberSeniority || !dto.teamMemberStartDate)
      return res.status(400).json({ error: 'teamMemberNames, teamMemberSurnames, teamMemberSeniority and teamMemberStartDate are required' });

    // Get current user ID from auth middleware
    const userId = (req as any).user?.userId || null;
    const now = new Date();

    // Build full TeamMember object with auto-populated audit fields
    const teamMemberData: Prisma.TeamMemberUncheckedCreateInput = {
      teamMemberNames: dto.teamMemberNames,
      teamMemberSurnames: dto.teamMemberSurnames,
      teamMemberSeniority: dto.teamMemberSeniority,
      teamMemberStartDate: typeof dto.teamMemberStartDate === 'string' ? new Date(dto.teamMemberStartDate) : dto.teamMemberStartDate,
      teamMemberKnownAs: dto.teamMemberKnownAs,
      teamMemberCreatedBy: userId,
      teamMemberCreatedDate: now,
      teamMemberLastUpdatedBy: userId,
      teamMemberLastUpdatedDate: now,
      teamMemberPrimaryRole: dto.teamMemberPrimaryRole,
      countryId: dto.countryId,
    };

    const created = await createTeamMember(teamMemberData);
    const resultDto: TeamMemberDTO = created as TeamMemberDTO;
    res.status(201).json(resultDto);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

// PUT /team-members/:id
router.put('/:id', requirePermission('TeamMembers', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const dto = req.body as UpdateTeamMemberDTO;

    // Get current user ID from auth middleware
    const userId = (req as any).user?.userId || null;
    const now = new Date();

    // Add auto-populated audit fields - only include fields that are actually provided
    const updateData: Prisma.TeamMemberUncheckedUpdateInput = {
      teamMemberLastUpdatedBy: userId,
      teamMemberLastUpdatedDate: now,
    };

    // Only add fields that are actually provided in the DTO
    if (dto.teamMemberNames !== undefined) updateData.teamMemberNames = dto.teamMemberNames;
    if (dto.teamMemberSurnames !== undefined) updateData.teamMemberSurnames = dto.teamMemberSurnames;
    if (dto.teamMemberKnownAs !== undefined) updateData.teamMemberKnownAs = dto.teamMemberKnownAs;
    if (dto.teamMemberSeniority !== undefined) updateData.teamMemberSeniority = dto.teamMemberSeniority;
    if (dto.teamMemberPrimaryRole !== undefined) updateData.teamMemberPrimaryRole = dto.teamMemberPrimaryRole;
    if (dto.countryId !== undefined) updateData.countryId = dto.countryId;
    if (dto.teamMemberStartDate !== undefined) {
      updateData.teamMemberStartDate = typeof dto.teamMemberStartDate === 'string' 
        ? new Date(dto.teamMemberStartDate) 
        : dto.teamMemberStartDate;
    }

    const updated = await updateTeamMember(id, updateData);
    if (!updated) return res.status(404).json({ error: 'Team member not found' });

    const resultDto: TeamMemberDTO = updated as TeamMemberDTO;
    res.json(resultDto);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// DELETE /team-members/:id
router.delete('/:id', requirePermission('TeamMembers', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteTeamMember(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

export default router;
