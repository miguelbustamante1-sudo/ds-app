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
import { prisma } from '../../db/prisma';
import { formatDateDDMMYYYY } from '../../services/timeoff/components/FormatDateDDMMYYYY';
import { getWorkdayBalance } from '../../services/timeoff/components/GetWorkdayBalance';
import { adjustWorkdayBalance } from '../../services/timeoff/components/AdjustWorkdayBalance';

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

// GET /team-member/:teamMemberId/workday-balance
router.get('/team-member/:teamMemberId/workday-balance', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorId } = req as ResolvedAuthRequest;

    const targetTeamMemberId = parseIdParam(req.params.teamMemberId);
    if (targetTeamMemberId === null) {
      return res.status(400).json({ error: 'Invalid team member id' });
    }

    const hasAuthority = await verifySupervisorRelationship(supervisorId, targetTeamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to view workday balance for this team member' });
    }

    const balance = await getWorkdayBalance(targetTeamMemberId);
    res.json(balance);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workday balance' });
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

    const createdBy = (req as ResolvedAuthRequest).user?.email ?? 'unknown';

    // Auto-create actionable notification for the employee & adjust balance
    try {
      const employeeUserIds = await getUserIdsByTeamMemberIds([teamMemberId]);
      const employeeUserId = employeeUserIds[0];

      const category = await prisma.timeOffCategory.findUnique({
        where: { categoryId },
        select: { categoryName: true },
      });
      const categoryLabel = category?.categoryName ?? 'time-off';

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
            description: `created a ${categoryLabel} time-off for you`,
            link: `/timeoff-detail/${created.timeOffId}`,
            day: 'Today',
            info: `${formatDateDDMMYYYY(timeOffStartDate)} to ${formatDateDDMMYYYY(timeOffEndDate)}`,
            sourceId: created.timeOffId,
            sourceEntity: 'TimeOff',
          },
          recipients: [{ userId: employeeUserId, actionType: 'actionable' }],
        });
      }

      await adjustWorkdayBalance(teamMemberId, categoryLabel, totalDays, createdBy);
    } catch (notifErr) {
      console.error('[TimeOff] Failed to create notification or adjust balance on supervisor create:', notifErr);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('[TimeOff] Error creating supervisor time-off:', err);
    res.status(500).json({ error: 'Failed to create time-off' });
  }
});

// POST /split — Atomic SV vacation split for a supervised team member
router.post('/split', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;
    const createdBy = (req as ResolvedAuthRequest).user?.email ?? 'unknown';

    const { teamMemberId, categoryId, periodA, periodB, comment } = req.body as {
      teamMemberId?: number;
      categoryId?: number;
      periodA?: { startDate: string; endDate: string };
      periodB?: { startDate: string; endDate: string };
      comment?: string;
    };

    if (!teamMemberId) {
      return res.status(400).json({ error: 'teamMemberId is required' });
    }
    if (categoryId === undefined || categoryId === null) {
      return res.status(400).json({ error: 'categoryId is required' });
    }
    if (!periodA?.startDate || !periodA?.endDate) {
      return res.status(400).json({ error: 'periodA startDate and endDate are required' });
    }
    if (!periodB?.startDate || !periodB?.endDate) {
      return res.status(400).json({ error: 'periodB startDate and endDate are required' });
    }

    const hasAuthority = await verifySupervisorRelationship(supervisorTeamMemberId, teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to create time-off for this team member' });
    }

    const effectiveStatusId = DEFAULTS.STATUS_ID;

    const [validationA, validationB] = await Promise.all([
      validateTimeOff({
        teamMemberId,
        categoryId,
        timeOffStartDate: new Date(periodA.startDate),
        timeOffEndDate: new Date(periodA.endDate),
        statusId: effectiveStatusId,
      }),
      validateTimeOff({
        teamMemberId,
        categoryId,
        timeOffStartDate: new Date(periodB.startDate),
        timeOffEndDate: new Date(periodB.endDate),
        statusId: effectiveStatusId,
      }),
    ]);

    if (!validationA.valid) {
      return res.status(400).json({ error: 'Period 1 validation failed', details: validationA.errors });
    }
    if (!validationB.valid) {
      return res.status(400).json({ error: 'Period 2 validation failed', details: validationB.errors });
    }

    const [{ totalDays: daysA }, { totalDays: daysB }] = await Promise.all([
      calculateTimeOffDaysForTeamMember(teamMemberId, categoryId, new Date(periodA.startDate), new Date(periodA.endDate)),
      calculateTimeOffDaysForTeamMember(teamMemberId, categoryId, new Date(periodB.startDate), new Date(periodB.endDate)),
    ]);

    const now = new Date();

    const [createdA, createdB] = await prisma.$transaction(async (tx) => {
      const a = await tx.timeOff.create({
        data: {
          teamMemberId,
          timeOffStartDate: new Date(periodA.startDate),
          timeOffEndDate: new Date(periodA.endDate),
          timeOffDays: daysA,
          timeOffCreatedBy: userId,
          timeOffCreatedDate: now,
          categoryId,
          statusId: effectiveStatusId,
        },
      });
      const b = await tx.timeOff.create({
        data: {
          teamMemberId,
          timeOffStartDate: new Date(periodB.startDate),
          timeOffEndDate: new Date(periodB.endDate),
          timeOffDays: daysB,
          timeOffCreatedBy: userId,
          timeOffCreatedDate: now,
          categoryId,
          statusId: effectiveStatusId,
        },
      });
      return [a, b] as const;
    });

    const logComment = comment?.trim() || 'SV vacation split request created by supervisor';

    await Promise.all([
      createTimeOffChangeLog({
        timeOffId: createdA.timeOffId,
        comment: logComment,
        oldValues: null,
        newValues: { timeOffStartDate: periodA.startDate, timeOffEndDate: periodA.endDate, categoryId, statusId: effectiveStatusId },
        createdByUserId: userId,
      }),
      createTimeOffChangeLog({
        timeOffId: createdB.timeOffId,
        comment: logComment,
        oldValues: null,
        newValues: { timeOffStartDate: periodB.startDate, timeOffEndDate: periodB.endDate, categoryId, statusId: effectiveStatusId },
        createdByUserId: userId,
      }),
    ]);

    try {
      const employeeUserIds = await getUserIdsByTeamMemberIds([teamMemberId]);
      const employeeUserId = employeeUserIds[0];

      const category = await prisma.timeOffCategory.findUnique({
        where: { categoryId },
        select: { categoryName: true },
      });
      const categoryLabel = category?.categoryName ?? 'time-off';

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
            description: `created a split ${categoryLabel} time-off for you`,
            link: `/timeoff-detail/${createdA.timeOffId}`,
            day: 'Today',
            info: `${formatDateDDMMYYYY(periodA.startDate)} to ${formatDateDDMMYYYY(periodB.endDate)}`,
            sourceId: createdA.timeOffId,
            sourceEntity: 'TimeOff',
          },
          recipients: [{ userId: employeeUserId, actionType: 'actionable' }],
        });
      }

      await adjustWorkdayBalance(teamMemberId, categoryLabel, daysA, createdBy);
      await adjustWorkdayBalance(teamMemberId, categoryLabel, daysB, createdBy);
    } catch (notifErr) {
      console.error('[TimeOff] Failed to create notification or adjust balance on supervisor split create:', notifErr);
    }

    res.status(201).json({ periodA: createdA, periodB: createdB });
  } catch (err) {
    console.error('[TimeOff] Error creating supervisor split vacation:', err);
    res.status(500).json({ error: 'Failed to create split vacation requests' });
  }
});

// PATCH /:timeOffId/acknowledge
router.patch('/:timeOffId/acknowledge', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
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
      return res.status(403).json({ error: 'Not authorized to acknowledge this time-off' });
    }

    const acknowledgedStatus = await getStatusByName('acknowledged');
    if (!acknowledgedStatus) {
      return res.status(500).json({ error: 'Acknowledged status not found in system' });
    }

    if (timeOff.statusId === acknowledgedStatus.statusId) {
      return res.status(400).json({ error: 'Time-off is already acknowledged' });
    }

    const updated = await updateTimeOff(
      timeOffId,
      timeOff.teamMemberId,
      timeOff.timeOffStartDate,
      timeOff.timeOffEndDate,
      userId,
      new Date().toISOString(),
      timeOff.categoryId,
      acknowledgedStatus.statusId
    );

    await createTimeOffChangeLog({
      timeOffId,
      comment: 'Acknowledged by supervisor',
      oldValues: { statusId: timeOff.statusId },
      newValues: { statusId: acknowledgedStatus.statusId },
      createdByUserId: userId,
    });

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error acknowledging time-off:', err);
    res.status(500).json({ error: 'Failed to acknowledge time-off' });
  }
});

// PATCH /:timeOffId/cancel
router.patch('/:timeOffId/cancel', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;
    const createdBy = (req as ResolvedAuthRequest).user?.email ?? 'unknown';

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

    const oldDays = Number(timeOff.timeOffDays);
    const employeeTeamMemberId = timeOff.teamMemberId;

    const categoryRecord = timeOff.categoryId
      ? await prisma.timeOffCategory.findUnique({ where: { categoryId: timeOff.categoryId }, select: { categoryName: true } })
      : null;
    const categoryName = categoryRecord?.categoryName ?? '';

    const updated = await updateTimeOff(
      timeOffId,
      employeeTeamMemberId,
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

    try {
      await adjustWorkdayBalance(employeeTeamMemberId, categoryName, -oldDays, createdBy);
    } catch (balanceErr) {
      console.error('[TimeOff] Failed to restore balance on supervisor cancel:', balanceErr);
    }

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
    const createdBy = (req as ResolvedAuthRequest).user?.email ?? 'unknown';

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

    if (timeOff.statusId === 5) { // Rejected
      return res.status(400).json({ error: 'Cannot edit a rejected time-off request' });
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

    const oldDays = Number(timeOff.timeOffDays);

    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      timeOff.teamMemberId,
      categoryId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    const categoryRecord = await prisma.timeOffCategory.findUnique({
      where: { categoryId },
      select: { categoryName: true },
    });
    const categoryName = categoryRecord?.categoryName ?? '';

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

    try {
      const delta = totalDays - oldDays;
      await adjustWorkdayBalance(timeOff.teamMemberId, categoryName, delta, createdBy);
    } catch (balanceErr) {
      console.error('[TimeOff] Failed to adjust balance on supervisor edit:', balanceErr);
    }

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error editing supervisor time-off:', err);
    res.status(500).json({ error: 'Failed to edit time-off' });
  }
});

export default router;
