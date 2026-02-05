import express from 'express';
import type { Response } from 'express';
import type { TimeOff } from '@prisma/client';
import {
  getAllTimeOffs,
  getTimeOffById,
  getTimeOffsByTeamMemberId,
  getMyTimeOffs,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff,
} from '../db/timeOffs';
import { getTeamMemberIdByAuthEmail, getUserIdByAuthEmail } from '../db/users';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { validateTimeOff, DEFAULTS } from '../services/timeoff/validation';
import { getTeamMembersBySupervisor, verifySupervisorRelationship, getTeamTimeOffByMonth, getTeamTimeOffCurrentMonth, getTeamYearlySummary, getTeamMemberTimeOffBreakdown, getAllTeamTimeOffs } from '../services/timeoff/supervisor';
import { createTimeOffChangeLog } from '../services/timeoff/changelog';
import { calculateTimeOffDaysForTeamMember } from '../services/timeoff/dayCalculation';
import { getStatusByName } from '../db/timeOffStatuses';

const router = express.Router();

// GET /time-offs
router.get('/', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeOffs: TimeOff[] = await getAllTimeOffs();
    res.json(timeOffs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch time offs' });
  }
});

// GET /time-offs/my-requests - Get time offs for the current authenticated user
router.get('/my-requests', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const teamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const timeOffs = await getMyTimeOffs(teamMemberId);
    res.json(timeOffs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch time offs' });
  }
});

// PATCH /time-offs/my-requests/:timeOffId/cancel - Cancel own time off request
router.patch('/my-requests/:timeOffId/cancel', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const teamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const userId = await getUserIdByAuthEmail(authUserEmail);

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { comment } = req.body as { comment?: string };
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required for cancellation' });
    }

    // Get the time-off to verify ownership
    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    // Verify ownership
    if (timeOff.teamMemberId !== teamMemberId) {
      return res.status(403).json({ error: 'Not authorized to cancel this time-off' });
    }

    // Get cancelled status
    const cancelledStatus = await getStatusByName('cancelled');
    if (!cancelledStatus) {
      return res.status(500).json({ error: 'Cancelled status not found in system' });
    }

    // Check if already cancelled
    if (timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Time-off is already cancelled' });
    }

    // Update the time-off status
    const updated = await updateTimeOff(
      timeOffId,
      teamMemberId,
      timeOff.timeOffStartDate,
      timeOff.timeOffEndDate,
      userId,
      new Date().toISOString(),
      timeOff.categoryId,
      cancelledStatus.statusId
    );

    // Create changelog entry
    await createTimeOffChangeLog({
      timeOffId,
      comment: comment.trim(),
      oldValues: { statusId: timeOff.statusId },
      newValues: { statusId: cancelledStatus.statusId },
      createdByUserId: userId,
    });

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error cancelling own time-off:', err);
    res.status(500).json({ error: 'Failed to cancel time-off' });
  }
});

// PATCH /time-offs/my-requests/:timeOffId - Edit own time off request
router.patch('/my-requests/:timeOffId', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const teamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const userId = await getUserIdByAuthEmail(authUserEmail);

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { timeOffStartDate, timeOffEndDate, categoryId, comment } = req.body as {
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number;
      comment?: string;
    };

    // Basic type validation
    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') {
      return res.status(400).json({ error: 'timeOffStartDate is required' });
    }
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') {
      return res.status(400).json({ error: 'timeOffEndDate is required' });
    }
    if (categoryId === undefined || categoryId === null) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    // Get the time-off to verify ownership and status
    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    // Verify ownership
    if (timeOff.teamMemberId !== teamMemberId) {
      return res.status(403).json({ error: 'Not authorized to edit this time-off' });
    }

    // Check if cancelled (cannot edit cancelled requests)
    const cancelledStatus = await getStatusByName('cancelled');
    if (cancelledStatus && timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Cannot edit a cancelled time-off request' });
    }

    // Run validation with timeOffId for self-exclusion in overlap check
    const validationResult = await validateTimeOff({
      teamMemberId,
      categoryId,
      timeOffStartDate: new Date(timeOffStartDate),
      timeOffEndDate: new Date(timeOffEndDate),
      statusId: timeOff.statusId,
      timeOffId,
    });

    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors,
      });
    }

    // Calculate time off days based on team member's country
    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    // Update the time-off
    const updated = await updateTimeOff(
      timeOffId,
      teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      userId,
      new Date().toISOString(),
      categoryId,
      timeOff.statusId,
      totalDays
    );

    // Create changelog entry
    await createTimeOffChangeLog({
      timeOffId,
      comment: comment || 'Time-off updated',
      oldValues: {
        timeOffStartDate: timeOff.timeOffStartDate,
        timeOffEndDate: timeOff.timeOffEndDate,
        categoryId: timeOff.categoryId,
      },
      newValues: {
        timeOffStartDate,
        timeOffEndDate,
        categoryId,
      },
      createdByUserId: userId,
    });

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error editing own time-off:', err);
    res.status(500).json({ error: 'Failed to edit time-off' });
  }
});

// POST /time-offs/my-requests - Create time off for the current authenticated user
router.post('/my-requests', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const teamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!teamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const userId = await getUserIdByAuthEmail(authUserEmail);

    const { timeOffStartDate, timeOffEndDate, categoryId, warningReviewComment } = req.body as {
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number;
      warningReviewComment?: string;
    };

    // Basic type validation
    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') {
      return res.status(400).json({ error: 'timeOffStartDate is required' });
    }
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') {
      return res.status(400).json({ error: 'timeOffEndDate is required' });
    }
    if (categoryId === undefined || categoryId === null) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    // Log warning comment for future implementation
    if (warningReviewComment) {
      console.log(`[TimeOff] Warning review comment for teamMemberId ${teamMemberId}:`, warningReviewComment);
    }

    // Apply default status (Tentative)
    const effectiveStatusId = DEFAULTS.STATUS_ID;

    // Run validation
    const validationResult = await validateTimeOff({
      teamMemberId,
      categoryId,
      timeOffStartDate: new Date(timeOffStartDate),
      timeOffEndDate: new Date(timeOffEndDate),
      statusId: effectiveStatusId,
    });

    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors,
      });
    }

    // Calculate time off days based on team member's country
    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    const created = await createTimeOff(
      teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      userId,
      new Date().toISOString(),
      categoryId,
      effectiveStatusId,
      totalDays
    );
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create time off' });
  }
});

// ============================================
// SUPERVISOR ENDPOINTS
// ============================================

// GET /time-offs/supervisor/my-team-members - Get all team members under the current supervisor
router.get('/supervisor/my-team-members', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const teamMembers = await getTeamMembersBySupervisor(supervisorTeamMemberId);
    res.json(teamMembers);
  } catch (err) {
    console.error('[TimeOff] Error fetching team members:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// GET /time-offs/supervisor/team-timeoff-by-month - Get aggregated time-off days by month for supervised team
router.get('/supervisor/team-timeoff-by-month', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await getTeamTimeOffByMonth(supervisorTeamMemberId, year);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching team time-off by month:', err);
    res.status(500).json({ error: 'Failed to fetch team time-off data' });
  }
});

// GET /time-offs/supervisor/team-timeoff-current-month - Get team time-off for current month (dashboard card)
router.get('/supervisor/team-timeoff-current-month', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const data = await getTeamTimeOffCurrentMonth(supervisorTeamMemberId);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching team time-off for current month:', err);
    res.status(500).json({ error: 'Failed to fetch team time-off data for current month' });
  }
});

// GET /time-offs/supervisor/team-yearly-summary - Get yearly time-off summary for all team members
router.get('/supervisor/team-yearly-summary', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await getTeamYearlySummary(supervisorTeamMemberId, year);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching team yearly summary:', err);
    res.status(500).json({ error: 'Failed to fetch team yearly summary' });
  }
});

// GET /time-offs/supervisor/all-team-timeoffs - Get all time-offs for all supervised team members
router.get('/supervisor/all-team-timeoffs', requirePermission('SupervisorTimeOff', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const data = await getAllTeamTimeOffs(supervisorTeamMemberId);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching all team time-offs:', err);
    res.status(500).json({ error: 'Failed to fetch all team time-offs' });
  }
});

// GET /time-offs/supervisor/team-member/:teamMemberId/yearly-breakdown - Get time-off breakdown by category
router.get('/supervisor/team-member/:teamMemberId/yearly-breakdown', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const teamMemberId = Number(req.params.teamMemberId);
    if (Number.isNaN(teamMemberId)) {
      return res.status(400).json({ error: 'Invalid team member id' });
    }

    // Verify supervisor relationship
    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to view time-off breakdown for this team member' });
    }

    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await getTeamMemberTimeOffBreakdown(teamMemberId, year);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching team member yearly breakdown:', err);
    res.status(500).json({ error: 'Failed to fetch time-off breakdown' });
  }
});

// GET /time-offs/supervisor/team-member/:teamMemberId - Get time-offs for a supervised team member
router.get('/supervisor/team-member/:teamMemberId', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const teamMemberId = Number(req.params.teamMemberId);
    if (Number.isNaN(teamMemberId)) {
      return res.status(400).json({ error: 'Invalid team member id' });
    }

    // Verify supervisor relationship
    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to view time-offs for this team member' });
    }

    const timeOffs = await getMyTimeOffs(teamMemberId);
    res.json(timeOffs);
  } catch (err) {
    console.error('[TimeOff] Error fetching team member time-offs:', err);
    res.status(500).json({ error: 'Failed to fetch time-offs for team member' });
  }
});

// POST /time-offs/supervisor/request - Create time-off on behalf of a team member
router.post('/supervisor/request', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const userId = await getUserIdByAuthEmail(authUserEmail);

    const { teamMemberId, timeOffStartDate, timeOffEndDate, categoryId, comment } = req.body as {
      teamMemberId?: number;
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number;
      comment?: string;
    };

    // Basic type validation
    if (!teamMemberId) {
      return res.status(400).json({ error: 'teamMemberId is required' });
    }
    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') {
      return res.status(400).json({ error: 'timeOffStartDate is required' });
    }
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') {
      return res.status(400).json({ error: 'timeOffEndDate is required' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    // Verify supervisor relationship
    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to create time-off for this team member' });
    }

    // Apply default status (Tentative)
    const effectiveStatusId = DEFAULTS.STATUS_ID;

    // Run validation
    const validationResult = await validateTimeOff({
      teamMemberId,
      categoryId,
      timeOffStartDate: new Date(timeOffStartDate),
      timeOffEndDate: new Date(timeOffEndDate),
      statusId: effectiveStatusId,
    });

    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors,
      });
    }

    // Calculate time off days based on team member's country
    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    // Create the time-off
    const created = await createTimeOff(
      teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      userId,
      new Date().toISOString(),
      categoryId,
      effectiveStatusId,
      totalDays
    );

    // Create changelog entry
    await createTimeOffChangeLog({
      timeOffId: created.timeOffId,
      comment: comment || 'Time-off created by supervisor',
      oldValues: null,
      newValues: {
        timeOffStartDate,
        timeOffEndDate,
        categoryId,
        statusId: effectiveStatusId,
      },
      createdByUserId: userId,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('[TimeOff] Error creating supervisor time-off:', err);
    res.status(500).json({ error: 'Failed to create time-off' });
  }
});

// PATCH /time-offs/supervisor/:timeOffId - Edit a time-off request for a supervised team member
router.patch('/supervisor/:timeOffId', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const userId = await getUserIdByAuthEmail(authUserEmail);

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { timeOffStartDate, timeOffEndDate, categoryId, comment } = req.body as {
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number;
      comment?: string;
    };

    // Basic type validation
    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') {
      return res.status(400).json({ error: 'timeOffStartDate is required' });
    }
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') {
      return res.status(400).json({ error: 'timeOffEndDate is required' });
    }
    if (categoryId === undefined || categoryId === null) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    // Get the time-off to verify ownership and status
    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    // Verify supervisor relationship
    if (!timeOff.teamMemberId) {
      return res.status(400).json({ error: 'Time-off has no associated team member' });
    }
    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, timeOff.teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to edit this time-off' });
    }

    // Check if cancelled (cannot edit cancelled requests)
    const cancelledStatus = await getStatusByName('cancelled');
    if (cancelledStatus && timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Cannot edit a cancelled time-off request' });
    }

    // Run validation with timeOffId for self-exclusion in overlap check
    const validationResult = await validateTimeOff({
      teamMemberId: timeOff.teamMemberId,
      categoryId,
      timeOffStartDate: new Date(timeOffStartDate),
      timeOffEndDate: new Date(timeOffEndDate),
      statusId: timeOff.statusId,
      timeOffId,
    });

    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors,
      });
    }

    // Calculate time off days based on team member's country
    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      timeOff.teamMemberId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    // Update the time-off
    const updated = await updateTimeOff(
      timeOffId,
      timeOff.teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      userId,
      new Date().toISOString(),
      categoryId,
      timeOff.statusId,
      totalDays
    );

    // Create changelog entry
    await createTimeOffChangeLog({
      timeOffId,
      comment: comment || 'Time-off updated by supervisor',
      oldValues: {
        timeOffStartDate: timeOff.timeOffStartDate,
        timeOffEndDate: timeOff.timeOffEndDate,
        categoryId: timeOff.categoryId,
      },
      newValues: {
        timeOffStartDate,
        timeOffEndDate,
        categoryId,
      },
      createdByUserId: userId,
    });

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error editing supervisor time-off:', err);
    res.status(500).json({ error: 'Failed to edit time-off' });
  }
});

// PATCH /time-offs/supervisor/:timeOffId/cancel - Cancel a time-off request
router.patch('/supervisor/:timeOffId/cancel', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const supervisorTeamMemberId = await getTeamMemberIdByAuthEmail(authUserEmail);
    if (!supervisorTeamMemberId) {
      return res.status(404).json({ error: 'Team member not found for current user' });
    }

    const userId = await getUserIdByAuthEmail(authUserEmail);

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { comment } = req.body as { comment?: string };
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required for cancellation' });
    }

    // Get the time-off to verify ownership and current status
    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    // Verify supervisor relationship
    if (!timeOff.teamMemberId) {
      return res.status(400).json({ error: 'Time-off has no associated team member' });
    }
    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, timeOff.teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to cancel this time-off' });
    }

    // Get cancelled status
    const cancelledStatus = await getStatusByName('cancelled');
    if (!cancelledStatus) {
      return res.status(500).json({ error: 'Cancelled status not found in system' });
    }

    // Check if already cancelled
    if (timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Time-off is already cancelled' });
    }

    // Update the time-off status
    const updated = await updateTimeOff(
      timeOffId,
      timeOff.teamMemberId,
      timeOff.timeOffStartDate,
      timeOff.timeOffEndDate,
      userId,
      new Date().toISOString(),
      timeOff.categoryId,
      cancelledStatus.statusId
    );

    // Create changelog entry
    await createTimeOffChangeLog({
      timeOffId,
      comment: comment.trim(),
      oldValues: { statusId: timeOff.statusId },
      newValues: { statusId: cancelledStatus.statusId },
      createdByUserId: userId,
    });

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error cancelling time-off:', err);
    res.status(500).json({ error: 'Failed to cancel time-off' });
  }
});

// GET /time-offs/:id
router.get('/:id', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const timeOff = await getTimeOffById(id);
    if (!timeOff) return res.status(404).json({ error: 'Time off not found' });

    res.json(timeOff);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch time off' });
  }
});

// GET /time-offs/team-member/:teamMemberId
router.get(
  '/team-member/:teamMemberId',
  requirePermission('TimeOffs', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = Number(req.params.teamMemberId);
      if (Number.isNaN(teamMemberId))
        return res.status(400).json({ error: 'Invalid team member id' });

      const timeOffs = await getTimeOffsByTeamMemberId(teamMemberId);
      res.json(timeOffs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch time offs for team member' });
    }
  }
);

// POST /time-offs
router.post('/', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamMemberId, timeOffStartDate, timeOffEndDate, categoryId, statusId, warningReviewComment } = req.body as {
      teamMemberId?: number | null;
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number | null;
      statusId?: number | null;
      warningReviewComment?: string;
    };

    // Log warning comment for future implementation
    if (warningReviewComment) {
      console.log(`[TimeOff] Warning review comment for teamMemberId ${teamMemberId}:`, warningReviewComment);
    }

    // Basic type validation
    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') {
      return res.status(400).json({ error: 'timeOffStartDate is required' });
    }
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') {
      return res.status(400).json({ error: 'timeOffEndDate is required' });
    }
    if (teamMemberId === undefined || teamMemberId === null) {
      return res.status(400).json({ error: 'teamMemberId is required' });
    }
    if (categoryId === undefined || categoryId === null) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    // Apply default status if not provided
    const effectiveStatusId = statusId ?? DEFAULTS.STATUS_ID;

    // Run validation
    const validationResult = await validateTimeOff({
      teamMemberId,
      categoryId,
      timeOffStartDate: new Date(timeOffStartDate),
      timeOffEndDate: new Date(timeOffEndDate),
      statusId: effectiveStatusId,
    });

    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors,
      });
    }

    // Calculate time off days based on team member's country
    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    const created = await createTimeOff(
      teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      req.user?.id ?? null,
      new Date().toISOString(),
      categoryId,
      effectiveStatusId,
      totalDays
    );
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create time off' });
  }
});

// PUT /time-offs/:id
router.put('/:id', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { teamMemberId, timeOffStartDate, timeOffEndDate, categoryId, statusId } = req.body as {
      teamMemberId?: number | null;
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number | null;
      statusId?: number | null;
    };

    // Basic type validation
    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') {
      return res.status(400).json({ error: 'timeOffStartDate is required' });
    }
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') {
      return res.status(400).json({ error: 'timeOffEndDate is required' });
    }
    if (teamMemberId === undefined || teamMemberId === null) {
      return res.status(400).json({ error: 'teamMemberId is required' });
    }
    if (categoryId === undefined || categoryId === null) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    // Apply default status if not provided
    const effectiveStatusId = statusId ?? DEFAULTS.STATUS_ID;

    // Run validation with timeOffId for self-exclusion in overlap check
    const validationResult = await validateTimeOff({
      teamMemberId,
      categoryId,
      timeOffStartDate: new Date(timeOffStartDate),
      timeOffEndDate: new Date(timeOffEndDate),
      statusId: effectiveStatusId,
      timeOffId: id,
    });

    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors,
      });
    }

    // Calculate time off days based on team member's country
    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    const updated = await updateTimeOff(
      id,
      teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      req.user?.id ?? null,
      new Date().toISOString(),
      categoryId,
      effectiveStatusId,
      totalDays
    );
    if (!updated) return res.status(404).json({ error: 'Time off not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update time off' });
  }
});

// DELETE /time-offs/:id
router.delete(
  '/:id',
  requirePermission('TimeOffs', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

      await deleteTimeOff(id);

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete time off' });
    }
  }
);

export default router;
