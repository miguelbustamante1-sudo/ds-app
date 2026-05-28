import express from 'express';
import type { Request, Response } from 'express';
import type { TeamMemberDTO, CreateTeamMemberDTO, UpdateTeamMemberDTO } from '../../shared/dto';
import { getAllTeamMembersWithDetails, getTeamMemberById, getTeamMembersByCountry, getTeamMembersBySupervisor } from '../db/teamMembers';
import { getMyTeamMemberProfile } from '../db/users';
import { getAvailableResources } from '../services/teamMember/queries/getAvailableResources';
import {
  getReports, getAvailableForProject, getAvailableForProjectAll, getProfileForSupervisor,
  getMyOwnProfile, getSupervisorList, getSupervisorChain,
  createTeamMember, updateTeamMember, deleteTeamMember,
  TeamMemberNotFoundError, InvalidTierBandError,
} from '../services/teamMember';
import { getSupervisorsWithUserId } from '../services/teamMember/queries/getSupervisorsWithUserId';
import { getReportsForTeamOverview } from '../services/teamMember/queries/getReportsForTeamOverview';
import { AppError } from '../errors/AppError';
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
      tierBandId: item.tierBandId,
      teamMemberFullLegalName: item.teamMemberFullLegalName,
      teamMemberXid: item.teamMemberXid,
      teamMemberCreatedBy: item.teamMemberCreatedBy,
      teamMemberCreatedDate: item.teamMemberCreatedDate,
      teamMemberLastUpdatedBy: item.teamMemberLastUpdatedBy,
      teamMemberLastUpdatedDate: item.teamMemberLastUpdatedDate,
      // Include relation fields
      countryName:         item.country?.countryName ?? null,
      countryIso:          item.country?.countryIso ?? null,
      roleName:            item.primaryRole?.roleName ?? null,
      tierBandDescription: item.tierBand?.tierBandDescription ?? null,
      shiftId:             item.shiftId ?? null,
      shiftDescription:    item.shift?.description ?? null,
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

// GET /team-members/my-reports-overview
// Returns all reports (direct + indirect) enriched with vacation balance.
router.get('/my-reports-overview', requirePermission('TeamMembers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const overview = await getReportsForTeamOverview(teamMemberId);
    res.json({ data: overview });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// GET /team-members/me/profile - Full profile for the current user (no supervisor check)
router.get('/me/profile', requirePermission('TeamMembers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const profile = await getMyOwnProfile(teamMemberId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
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
    const projectId = Number(req.query.projectId);
    if (!req.query.projectId || Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    const isBsa = req.user?.roles.includes('bsa') ?? false;

    if (isBsa) {
      const resources = await getAvailableForProjectAll(projectId, q);
      return res.json(resources);
    }

    const supervisorId = req.user?.teamMemberId;
    if (!supervisorId) {
      return res.status(403).json({ error: 'Current user is not linked to a team member' });
    }

    const resources = await getAvailableForProject(supervisorId, projectId, q);
    res.json(resources);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch available resources under supervisor' });
  }
});

// GET /team-members/supervisors — all TMs who are currently acting as a supervisor
router.get('/supervisors', requirePermission('TeamMembers', 'read'), async (_req: Request, res: Response) => {
  try {
    const supervisors = await getSupervisorList();
    res.json(supervisors);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch supervisors' });
  }
});

// GET /team-members/supervisors-with-user-id — supervisors including their ds.tbl_users.usr_id
router.get('/supervisors-with-user-id', requirePermission('TeamMembers', 'read'), async (_req: Request, res: Response) => {
  try {
    const supervisors = await getSupervisorsWithUserId();
    res.json(supervisors);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch supervisors with user ID' });
  }
});

// GET /team-members/is-supervisor — returns { isSupervisor: boolean } for the current user
router.get('/is-supervisor', requirePermission('TeamMembers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) {
      return res.json({ isSupervisor: false });
    }

    const reports = await getReports(teamMemberId, false);
    res.json({ isSupervisor: reports.length > 0 });
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to check supervisor status' });
  }
});

// GET /team-members/:id/supervisor-chain — supervisor chain up to 3 levels
router.get('/:id/supervisor-chain', requirePermission('TeamMembers', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid team member ID' });

    const chain = await getSupervisorChain(id);
    res.json(chain);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch supervisor chain' });
  }
});

// GET /team-members/:teamMemberId/profile
router.get('/:teamMemberId/profile', requirePermission('TeamMembers', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supervisorId = req.user?.teamMemberId;
    if (!supervisorId) return res.status(401).json({ message: 'Unauthorized' });

    const targetId = parseInt(req.params.teamMemberId ?? '', 10);
    if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid team member ID' });

    const profile = await getProfileForSupervisor(supervisorId, targetId);
    if (!profile) return res.status(403).json({ message: 'Forbidden' });

    return res.json(profile);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch team member profile' });
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
router.post('/', requirePermission('TeamMembers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dto = req.body as CreateTeamMemberDTO;

    if (!dto.teamMemberNames || !dto.teamMemberSurnames || !dto.teamMemberStartDate || !dto.tierBandId)
      return res.status(400).json({ error: 'teamMemberNames, teamMemberSurnames, teamMemberStartDate and tierBandId are required' });

    const userId  = req.user?.dsUserId ?? null;
    const email   = req.user?.email ?? 'unknown';
    const created = await createTeamMember(dto, userId, email);

    res.status(201).json(created as unknown as TeamMemberDTO);
  } catch (err) {
    if (err instanceof InvalidTierBandError) return res.status(400).json({ error: err.message });
    error(err);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

// PUT /team-members/:id
router.put('/:id', requirePermission('TeamMembers', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const dto     = req.body as UpdateTeamMemberDTO;
    const userId  = req.user?.dsUserId ?? null;
    const email   = req.user?.email ?? 'unknown';
    const updated = await updateTeamMember(id, dto, userId, email);

    res.json(updated as unknown as TeamMemberDTO);
  } catch (err) {
    if (err instanceof TeamMemberNotFoundError) return res.status(404).json({ error: err.message });
    if (err instanceof InvalidTierBandError)    return res.status(400).json({ error: err.message });
    error(err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// DELETE /team-members/:id
router.delete('/:id', requirePermission('TeamMembers', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id    = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const email = req.user?.email ?? 'unknown';
    await deleteTeamMember(id, email);

    res.status(204).send();
  } catch (err) {
    if (err instanceof TeamMemberNotFoundError) return res.status(404).json({ error: err.message });
    error(err);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

export default router;
