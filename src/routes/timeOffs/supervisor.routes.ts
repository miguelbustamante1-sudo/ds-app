import express from 'express';
import type { Response } from 'express';
import {
  getTimeOffById,
  getMyTimeOffs,
  createTimeOff,
  updateTimeOff,
} from '../../db/timeOffs';
import { requirePermission } from '../../middleware/auth';
import { validateTimeOff, DEFAULTS } from '../../services/timeoff/validation';
import {
  getTeamMembersBySupervisor,
  verifySupervisorRelationship,
  getTeamTimeOffByMonth,
  getTeamTimeOffByCountry,
  getTeamTimeOffCurrentMonth,
  getTeamYearlySummary,
  getTeamMemberTimeOffBreakdown,
  getAllTeamTimeOffs,
} from '../../services/timeoff/supervisor';
import { createTimeOffChangeLog } from '../../services/timeoff/changelog';
import { calculateTimeOffDaysForTeamMember } from '../../services/timeoff/dayCalculation';
import { getStatusByName } from '../../db/timeOffStatuses';
import { resolveAuthUser, parseIdParam, type ResolvedAuthRequest } from './helpers';
import { notificationOrchestrator } from '../../services/notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../services/notifications/repository';

const router = express.Router();

// GET /my-team-members
router.get('/my-team-members', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const teamMembers = await getTeamMembersBySupervisor(teamMemberId);
    res.json(teamMembers);
  } catch (err) {
    console.error('[TimeOff] Error fetching team members:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// GET /team-timeoff-by-month
router.get('/team-timeoff-by-month', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await getTeamTimeOffByMonth(teamMemberId, year);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching team time-off by month:', err);
    res.status(500).json({ error: 'Failed to fetch team time-off data' });
  }
});

// GET /team-timeoff-by-country
router.get('/team-timeoff-by-country', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const data = await getTeamTimeOffByCountry(teamMemberId, startDate, endDate);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching team time-off by country:', err);
    res.status(500).json({ error: 'Failed to fetch team time-off by country data' });
  }
});

// GET /team-timeoff-current-month
router.get('/team-timeoff-current-month', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const data = await getTeamTimeOffCurrentMonth(teamMemberId);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching team time-off for current month:', err);
    res.status(500).json({ error: 'Failed to fetch team time-off data for current month' });
  }
});

// GET /team-yearly-summary
router.get('/team-yearly-summary', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await getTeamYearlySummary(teamMemberId, year);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching team yearly summary:', err);
    res.status(500).json({ error: 'Failed to fetch team yearly summary' });
  }
});

// GET /all-team-timeoffs
router.get('/all-team-timeoffs', requirePermission('SupervisorTimeOff', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const data = await getAllTeamTimeOffs(teamMemberId);
    res.json(data);
  } catch (err) {
    console.error('[TimeOff] Error fetching all team time-offs:', err);
    res.status(500).json({ error: 'Failed to fetch all team time-offs' });
  }
});

// GET /team-member/:teamMemberId/yearly-breakdown
router.get('/team-member/:teamMemberId/yearly-breakdown', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId } = req as ResolvedAuthRequest;

    const teamMemberId = parseIdParam(req.params.teamMemberId);
    if (teamMemberId === null) {
      return res.status(400).json({ error: 'Invalid team member id' });
    }

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

// GET /team-member/:teamMemberId
router.get('/team-member/:teamMemberId', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId } = req as ResolvedAuthRequest;

    const teamMemberId = parseIdParam(req.params.teamMemberId);
    if (teamMemberId === null) {
      return res.status(400).json({ error: 'Invalid team member id' });
    }

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

// POST /request
router.post('/request', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;

    const { teamMemberId, timeOffStartDate, timeOffEndDate, categoryId, comment } = req.body as {
      teamMemberId?: number;
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number;
      comment?: string;
    };

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

    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to create time-off for this team member' });
    }

    const effectiveStatusId = DEFAULTS.STATUS_ID;

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

    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
      categoryId,
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

    // Auto-create actionable notification for the employee
    try {
      const employeeUserIds = await getUserIdsByTeamMemberIds([teamMemberId]);
      const employeeUserId = employeeUserIds[0];
      if (employeeUserId !== undefined) {
        const authReq = req as ResolvedAuthRequest;
        const supervisorName = authReq.user?.firstName
          ? `${authReq.user.firstName} ${authReq.user.lastName ?? ''}`.trim()
          : 'Your supervisor';

        await notificationOrchestrator.create({
          categoryName: 'Inbox',
          itemType: 'item-3',
          payload: {
            userName: supervisorName,
            avatar: '300-1.png',
            badgeColor: 'online',
            description: 'created a time-off for you',
            link: '/my-time-off',
            day: 'Today',
            info: `${timeOffStartDate} to ${timeOffEndDate}`,
            sourceId: created.timeOffId,
            sourceEntity: 'TimeOff',
          },
          recipients: [{ userId: employeeUserId, actionType: 'actionable' }],
        });
      }
    } catch (notifErr) {
      console.error('[TimeOff] Failed to create notification for employee:', notifErr);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('[TimeOff] Error creating supervisor time-off:', err);
    res.status(500).json({ error: 'Failed to create time-off' });
  }
});

// PATCH /:timeOffId/cancel
router.patch('/:timeOffId/cancel', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { comment } = req.body as { comment?: string };
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required for cancellation' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    if (!timeOff.teamMemberId) {
      return res.status(400).json({ error: 'Time-off has no associated team member' });
    }
    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, timeOff.teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to cancel this time-off' });
    }

    const cancelledStatus = await getStatusByName('cancelled');
    if (!cancelledStatus) {
      return res.status(500).json({ error: 'Cancelled status not found in system' });
    }

    if (timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Time-off is already cancelled' });
    }

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

// PATCH /:timeOffId
router.patch('/:timeOffId', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;

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

    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') {
      return res.status(400).json({ error: 'timeOffStartDate is required' });
    }
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') {
      return res.status(400).json({ error: 'timeOffEndDate is required' });
    }
    if (categoryId === undefined || categoryId === null) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    if (!timeOff.teamMemberId) {
      return res.status(400).json({ error: 'Time-off has no associated team member' });
    }
    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, timeOff.teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to edit this time-off' });
    }

    const cancelledStatus = await getStatusByName('cancelled');
    if (cancelledStatus && timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Cannot edit a cancelled time-off request' });
    }

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

    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      timeOff.teamMemberId,
      categoryId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

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

export default router;
