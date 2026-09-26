import express from 'express';
import type { Response } from 'express';
import {
  getTimeOffById,
  getTimeOffsByTeamMember,
  createTimeOff,
  updateTimeOff,
} from '../../db/timeOffs';
import { requirePermission } from '../../middleware/auth';
import { validateTimeOff, DEFAULTS } from '../../services/timeoff/validation';
import { isOnlyDaysBeforeNoticeFailure } from '../../services/timeoff/validation/isOnlyDaysBeforeNoticeFailure';
import { buildDaysBeforeContextJson } from '../../services/timeoff/validation/buildDaysBeforeContextJson';
import {
  getTeamMembersBySupervisor,
  getTeamTimeOffByMonth,
  getTeamTimeOffByCountry,
  getTeamTimeOffCurrentMonth,
  getTeamYearlySummary,
  getTeamMemberTimeOffBreakdown,
  getAllTeamTimeOffs,
} from '../../services/timeoff/supervisor';
import { createTimeOffChangeLog, fetchRawTimeOffRow } from '../../services/timeoff/changelog';
import { calculateTimeOffDaysForTeamMember } from '../../services/timeoff/dayCalculation';
import { getStatusByName } from '../../db/timeOffStatuses';
import { resolveAuthUser, parseIdParam, checkSupervisorAuthority, type ResolvedAuthRequest } from './helpers';
import { notificationOrchestrator } from '../../services/notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../services/notifications/repository';
import { prisma } from '../../db/prisma';
import { formatDateDDMMYYYY } from '../../services/timeoff/components/FormatDateDDMMYYYY';
import { getWorkdayBalance } from '../../services/timeoff/components/GetWorkdayBalance';
import { auditOrchestrator } from '../../services/audit/AuditOrchestrator';
import { cancelSplitLeg } from '../../services/timeoff/split/CancelSplitLeg';
import { validateSplitLegOrdering, syncSplitParentStartDate } from '../../services/timeoff/split/SyncSplitParentStartDate';
import { AppError } from '../../errors/AppError';
import { acknowledgeTimeOffBySupervisor } from '../../services/timeoff/components/AcknowledgeTimeOffBySupervisor';
import { rejectTimeOffBySupervisor } from '../../services/timeoff/components/RejectTimeOffBySupervisor';
import { resolveVacationPeriod } from '../../services/timeoff/utils/resolveVacationPeriod';
import { startExceptionAuthorization } from '../../services/timeoff/components/StartExceptionAuthorization';
import { startExceptionAuthorizationOnEdit } from '../../services/timeoff/components/StartExceptionAuthorizationOnEdit';
import { TIMEOFF_STATUS_IN_AUTH } from '../../services/timeoff/components/ExceptionAuthorizationConstants';
import { instantiateExceptionAuthorizationWorkflow } from '../../services/timeoff/components/InstantiateExceptionAuthorizationWorkflow';

const SPLIT_STATUS_ID = 6;

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

    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, teamMemberId);
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

    const hasAuthority = await checkSupervisorAuthority(req,supervisorId, targetTeamMemberId);
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

    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to view time-offs for this team member' });
    }

    const timeOffs = await getTimeOffsByTeamMember(teamMemberId);
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

    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, teamMemberId);
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
      // A request that fails ONLY the days-before notice policy is saved as an
      // InAuth exception and routed through the exception-authorization workflow,
      // instead of being blocked outright. The workflow owner is the acting
      // supervisor (not the team member), so DYNAMIC/FIRST_SUPERVISOR resolves
      // to the supervisor's own supervisor.
      const onlyDaysBeforeFailure = isOnlyDaysBeforeNoticeFailure(validationResult.errors);

      if (onlyDaysBeforeFailure) {
        const authReq = req as ResolvedAuthRequest;
        const requestedByEmail = authReq.user?.email;
        if (!requestedByEmail || userId === null) {
          return res.status(401).json({ error: 'Unauthenticated' });
        }

        const { totalDays: exceptionTotalDays } = await calculateTimeOffDaysForTeamMember(
          teamMemberId,
          categoryId,
          new Date(timeOffStartDate),
          new Date(timeOffEndDate)
        );

        const exceptionVacationPeriod = await resolveVacationPeriod(teamMemberId, categoryId);

        const { created: exceptionCreated } = await startExceptionAuthorization({
          teamMemberId,
          timeOffStartDate,
          timeOffEndDate,
          categoryId,
          totalDays: exceptionTotalDays,
          vacationPeriod: exceptionVacationPeriod,
          requestedByUserId: userId,
          requestedByEmail,
          contextJson: buildDaysBeforeContextJson(validationResult.errors),
        });

        return res.status(201).json(exceptionCreated);
      }

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

    const vacationPeriod = await resolveVacationPeriod(teamMemberId, categoryId);

    const created = await createTimeOff(
      teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      userId,
      new Date().toISOString(),
      categoryId,
      effectiveStatusId,
      totalDays,
      undefined,
      false,
      vacationPeriod
    );

    const newRaw = await fetchRawTimeOffRow(created.timeOffId);

    await createTimeOffChangeLog({
      timeOffId: created.timeOffId,
      comment: comment || 'Time-off created by supervisor',
      oldValues: null,
      newValues: newRaw,
      createdByUserId: userId,
    });

    // Auto-create actionable notification for the employee (best-effort)
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
            isActionable: true,
          },
          recipients: [{ userId: employeeUserId, actionType: 'actionable' }],
        });
      }

    } catch (notifErr) {
      console.error('[TimeOff] Failed to create notification on supervisor create:', notifErr);
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

    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to create time-off for this team member' });
    }

    const authReq = req as ResolvedAuthRequest;
    const requestedByEmail = authReq.user?.email;
    if (!requestedByEmail || userId === null) {
      return res.status(401).json({ error: 'Unauthenticated' });
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

    // A leg that fails ONLY the days-before notice policy goes InAuth instead of
    // blocking the whole split. Any other failure (alone or combined) still blocks both legs.
    if (!validationA.valid && !isOnlyDaysBeforeNoticeFailure(validationA.errors)) {
      return res.status(400).json({ error: 'Period 1 validation failed', details: validationA.errors });
    }
    if (!validationB.valid && !isOnlyDaysBeforeNoticeFailure(validationB.errors)) {
      return res.status(400).json({ error: 'Period 2 validation failed', details: validationB.errors });
    }

    const legAIsException = !validationA.valid;
    const legBIsException = !validationB.valid;
    const legAStatusId = legAIsException ? TIMEOFF_STATUS_IN_AUTH : effectiveStatusId;
    const legBStatusId = legBIsException ? TIMEOFF_STATUS_IN_AUTH : effectiveStatusId;

    const [{ totalDays: daysA }, { totalDays: daysB }] = await Promise.all([
      calculateTimeOffDaysForTeamMember(teamMemberId, categoryId, new Date(periodA.startDate), new Date(periodA.endDate)),
      calculateTimeOffDaysForTeamMember(teamMemberId, categoryId, new Date(periodB.startDate), new Date(periodB.endDate)),
    ]);

    const now = new Date();

    const [originRecord, createdA, createdB] = await prisma.$transaction(async (tx) => {
      const origin = await tx.timeOff.create({
        data: {
          teamMemberId,
          timeOffStartDate: new Date(periodA.startDate),
          timeOffEndDate: new Date(periodB.endDate),
          timeOffDays: daysA + daysB,
          timeOffCreatedBy: userId,
          timeOffCreatedDate: now,
          categoryId,
          statusId: SPLIT_STATUS_ID,
          timeOffIsException: false,
        },
      });
      const a = await tx.timeOff.create({
        data: {
          teamMemberId,
          timeOffStartDate: new Date(periodA.startDate),
          timeOffEndDate: new Date(periodA.endDate),
          timeOffDays: daysA,
          timeOffCreatedBy: userId,
          timeOffCreatedDate: now,
          categoryId,
          statusId: legAStatusId,
          timeOffIsException: legAIsException,
          timeOffOriginalId: origin.timeOffId,
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
          statusId: legBStatusId,
          timeOffIsException: legBIsException,
          timeOffOriginalId: origin.timeOffId,
        },
      });
      return [origin, a, b] as const;
    });

    const defaultLogComment = comment?.trim() || 'SV vacation split request created by supervisor';
    const logCommentA = legAIsException
      ? 'Split Period A saved pending exception authorization (insufficient notice)'
      : defaultLogComment;
    const logCommentB = legBIsException
      ? 'Split Period B saved pending exception authorization (insufficient notice)'
      : defaultLogComment;

    const [rawA, rawB] = await Promise.all([
      fetchRawTimeOffRow(createdA.timeOffId),
      fetchRawTimeOffRow(createdB.timeOffId),
    ]);

    await Promise.all([
      createTimeOffChangeLog({
        timeOffId: createdA.timeOffId,
        comment: logCommentA,
        oldValues: null,
        newValues: rawA,
        createdByUserId: userId,
      }),
      createTimeOffChangeLog({
        timeOffId: createdB.timeOffId,
        comment: logCommentB,
        oldValues: null,
        newValues: rawB,
        createdByUserId: userId,
      }),
    ]);

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(originRecord.timeOffId),
      createdBy: authReq.user?.email ?? 'unknown',
      oldValues: null,
      newValues: originRecord as unknown as Record<string, unknown>,
      comment: 'Split origin record created — represents the original 15-day SV vacation replaced by a split',
    });
    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(createdA.timeOffId),
      createdBy: authReq.user?.email ?? 'unknown',
      oldValues: null,
      newValues: createdA as unknown as Record<string, unknown>,
      comment: legAIsException
        ? `Split Period A created pending exception authorization — linked to split origin ${originRecord.timeOffId}`
        : `Split Period A created — linked to split origin ${originRecord.timeOffId}`,
    });
    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(createdB.timeOffId),
      createdBy: authReq.user?.email ?? 'unknown',
      oldValues: null,
      newValues: createdB as unknown as Record<string, unknown>,
      comment: legBIsException
        ? `Split Period B created pending exception authorization — linked to split origin ${originRecord.timeOffId}`
        : `Split Period B created — linked to split origin ${originRecord.timeOffId}`,
    });

    // Start an independent exception-authorization workflow for each leg that needs one.
    if (legAIsException) {
      await instantiateExceptionAuthorizationWorkflow({
        timeOffId: createdA.timeOffId,
        requestedByUserId: userId,
        requestedByEmail,
        contextJson: buildDaysBeforeContextJson(validationA.errors),
      });
    }
    if (legBIsException) {
      await instantiateExceptionAuthorizationWorkflow({
        timeOffId: createdB.timeOffId,
        requestedByUserId: userId,
        requestedByEmail,
        contextJson: buildDaysBeforeContextJson(validationB.errors),
      });
    }

    try {
      const employeeUserIds = await getUserIdsByTeamMemberIds([teamMemberId]);
      const employeeUserId = employeeUserIds[0];

      const category = await prisma.timeOffCategory.findUnique({
        where: { categoryId },
        select: { categoryName: true },
      });
      const categoryLabel = category?.categoryName ?? 'time-off';

      if (employeeUserId !== undefined) {
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
            isActionable: true,
          },
          recipients: [{ userId: employeeUserId, actionType: 'actionable' }],
        });
      }

    } catch (notifErr) {
      console.error('[TimeOff] Failed to create notification on supervisor split create:', notifErr);
    }

    res.status(201).json({ origin: originRecord, periodA: createdA, periodB: createdB });
  } catch (err) {
    console.error('[TimeOff] Error creating supervisor split vacation:', err);
    res.status(500).json({ error: 'Failed to create split vacation requests' });
  }
});

// PATCH /:timeOffId/acknowledge
router.patch('/:timeOffId/acknowledge', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const authReq = req as ResolvedAuthRequest;
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId } = authReq;

    if (!resolvedUserId) {
      return res.status(401).json({ error: 'User ID could not be resolved' });
    }
    const userId = resolvedUserId;

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { comment } = req.body as { comment?: string };
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required for acknowledgement' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    if (!timeOff.teamMemberId) {
      return res.status(400).json({ error: 'Time-off has no associated team member' });
    }
    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, timeOff.teamMemberId);
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

    await acknowledgeTimeOffBySupervisor({
      timeOffId,
      oldStatusId: timeOff.statusId ?? 1,
      newStatusId: acknowledgedStatus.statusId!,
      comment: comment.trim(),
      userId,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(timeOffId),
      createdBy: authReq.user?.email ?? 'unknown',
      oldValues: { statusId: timeOff.statusId },
      newValues: { statusId: acknowledgedStatus.statusId },
      comment: 'Time-off approved by supervisor',
    });

    try {
      const employeeUserIds = await getUserIdsByTeamMemberIds([timeOff.teamMemberId]);
      const employeeUserId = employeeUserIds[0];
      if (employeeUserId !== undefined) {
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
            description: 'approved your time-off request',
            link: `/timeoff-detail/${timeOffId}`,
            day: 'Today',
            info: `${formatDateDDMMYYYY(timeOff.timeOffStartDate.toISOString())} to ${formatDateDDMMYYYY(timeOff.timeOffEndDate.toISOString())}`,
            sourceId: timeOffId,
            sourceEntity: 'TimeOff',
          },
          recipients: [{ userId: employeeUserId, actionType: 'readonly' }],
        });
      }
    } catch (notifErr) {
      console.error('[TimeOff] Failed to send approve notification:', notifErr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[TimeOff] Error acknowledging time-off:', err);
    res.status(500).json({ error: 'Failed to acknowledge time-off' });
  }
});

// PATCH /:timeOffId/reject
router.patch('/:timeOffId/reject', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const authReq = req as ResolvedAuthRequest;
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId } = authReq;

    if (!resolvedUserId) {
      return res.status(401).json({ error: 'User ID could not be resolved' });
    }
    const userId = resolvedUserId;

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { comment } = req.body as { comment?: string };
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required for rejection' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    if (!timeOff.teamMemberId) {
      return res.status(400).json({ error: 'Time-off has no associated team member' });
    }
    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, timeOff.teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to reject this time-off' });
    }

    const rejectedStatus = await getStatusByName('rejected');
    if (!rejectedStatus) {
      return res.status(500).json({ error: 'Rejected status not found in system' });
    }

    if (timeOff.statusId === rejectedStatus.statusId) {
      return res.status(400).json({ error: 'Time-off is already rejected' });
    }

    await rejectTimeOffBySupervisor({
      timeOffId,
      oldStatusId: timeOff.statusId ?? 1,
      newStatusId: rejectedStatus.statusId!,
      comment: comment.trim(),
      userId,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(timeOffId),
      createdBy: authReq.user?.email ?? 'unknown',
      oldValues: { statusId: timeOff.statusId },
      newValues: { statusId: rejectedStatus.statusId },
      comment: 'Time-off rejected by supervisor',
    });

    try {
      const employeeUserIds = await getUserIdsByTeamMemberIds([timeOff.teamMemberId]);
      const employeeUserId = employeeUserIds[0];
      if (employeeUserId !== undefined) {
        const supervisorName = authReq.user?.firstName
          ? `${authReq.user.firstName} ${authReq.user.lastName ?? ''}`.trim()
          : 'Your supervisor';
        await notificationOrchestrator.create({
          categoryName: 'Inbox',
          itemType: 'item-3',
          payload: {
            userName: supervisorName,
            avatar: '300-1.png',
            badgeColor: 'busy',
            description: 'denied your time-off request',
            link: `/timeoff-detail/${timeOffId}`,
            day: 'Today',
            info: `${formatDateDDMMYYYY(timeOff.timeOffStartDate.toISOString())} to ${formatDateDDMMYYYY(timeOff.timeOffEndDate.toISOString())}`,
            sourceId: timeOffId,
            sourceEntity: 'TimeOff',
          },
          recipients: [{ userId: employeeUserId, actionType: 'readonly' }],
        });
      }
    } catch (notifErr) {
      console.error('[TimeOff] Failed to send reject notification:', notifErr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[TimeOff] Error rejecting time-off:', err);
    res.status(500).json({ error: 'Failed to reject time-off' });
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
    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, timeOff.teamMemberId);
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

    if (timeOff.timeOffOriginalId !== null) {
      const requestedByEmail = (req as ResolvedAuthRequest).user?.email ?? 'unknown';
      try {
        await cancelSplitLeg({
          timeOffId,
          cancelledStatusId: cancelledStatus.statusId,
          comment: comment.trim(),
          cancelledByUserId: userId,
          cancelledByEmail: requestedByEmail,
        });
      } catch (err) {
        if (err instanceof AppError) {
          return res.status(err.statusCode).json({ error: err.message });
        }
        throw err;
      }
      return res.status(204).send();
    }

    const employeeTeamMemberId = timeOff.teamMemberId;

    const categoryRecord = timeOff.categoryId
      ? await prisma.timeOffCategory.findUnique({ where: { categoryId: timeOff.categoryId }, select: { categoryName: true } })
      : null;
    const categoryName = categoryRecord?.categoryName ?? '';

    const oldRaw = await fetchRawTimeOffRow(timeOffId);

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

    const newRaw = await fetchRawTimeOffRow(timeOffId);

    await createTimeOffChangeLog({
      timeOffId,
      comment: comment.trim(),
      oldValues: oldRaw,
      newValues: newRaw,
      createdByUserId: userId,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(timeOffId),
      createdBy: (req as ResolvedAuthRequest).user?.email ?? 'unknown',
      oldValues: oldRaw,
      newValues: newRaw,
      comment: comment.trim(),
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
    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, timeOff.teamMemberId);
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

    if (timeOff.statusId === SPLIT_STATUS_ID) {
      return res.status(400).json({ error: 'Cannot edit a split origin record' });
    }

    if (timeOff.statusId === TIMEOFF_STATUS_IN_AUTH) {
      return res.status(400).json({ error: 'Cannot edit a time-off request pending exception authorization' });
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
      // An edit that fails ONLY the days-before notice policy is saved as an
      // InAuth exception and routed through the exception-authorization workflow,
      // instead of being blocked outright. The workflow owner is the acting
      // supervisor (not the team member), so DYNAMIC/FIRST_SUPERVISOR resolves
      // to the supervisor's own supervisor.
      const onlyDaysBeforeFailure = isOnlyDaysBeforeNoticeFailure(validationResult.errors);

      if (onlyDaysBeforeFailure) {
        const authReq = req as ResolvedAuthRequest;
        const requestedByEmail = authReq.user?.email;
        if (!requestedByEmail || userId === null) {
          return res.status(401).json({ error: 'Unauthenticated' });
        }

        const { totalDays: exceptionTotalDays } = await calculateTimeOffDaysForTeamMember(
          timeOff.teamMemberId,
          categoryId,
          new Date(timeOffStartDate),
          new Date(timeOffEndDate)
        );

        const { updated: exceptionUpdated } = await startExceptionAuthorizationOnEdit({
          timeOffId,
          teamMemberId: timeOff.teamMemberId,
          timeOffStartDate,
          timeOffEndDate,
          categoryId,
          totalDays: exceptionTotalDays,
          requestedByUserId: userId,
          requestedByEmail,
          contextJson: buildDaysBeforeContextJson(validationResult.errors),
        });

        return res.json(exceptionUpdated);
      }

      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors,
      });
    }

    try {
      await validateSplitLegOrdering({
        editedTimeOffId: timeOffId,
        newStartDate: new Date(timeOffStartDate),
        newEndDate: new Date(timeOffEndDate),
      });
    } catch (err) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      throw err;
    }

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

    const oldRaw = await fetchRawTimeOffRow(timeOffId);

    const updated = await updateTimeOff(
      timeOffId,
      timeOff.teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      userId,
      new Date().toISOString(),
      categoryId,
      timeOff.statusId,
      totalDays,
      false
    );

    const newRaw = await fetchRawTimeOffRow(timeOffId);

    await createTimeOffChangeLog({
      timeOffId,
      comment: comment || 'Time-off updated by supervisor',
      oldValues: oldRaw,
      newValues: newRaw,
      createdByUserId: userId,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(timeOffId),
      createdBy: (req as ResolvedAuthRequest).user?.email ?? 'unknown',
      oldValues: oldRaw,
      newValues: newRaw,
      comment: comment || 'Time-off updated by supervisor',
    });

    await syncSplitParentStartDate({
      editedTimeOffId: timeOffId,
      newStartDate: new Date(timeOffStartDate),
      editedByUserId: userId,
      editedByEmail: (req as ResolvedAuthRequest).user?.email ?? 'unknown',
    });

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error editing supervisor time-off:', err);
    res.status(500).json({ error: 'Failed to edit time-off' });
  }
});

// POST /:timeOffId/convert-to-split — Supervisor converts an existing 15-day SV vacation into two Pending children
router.post('/:timeOffId/convert-to-split', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId: supervisorTeamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;

    const timeOffId = parseIdParam(req.params.timeOffId);
    if (timeOffId === null) {
      return res.status(400).json({ error: 'Invalid timeOffId' });
    }

    const { periodA, periodB, comment } = req.body as {
      periodA?: { startDate: string; endDate: string };
      periodB?: { startDate: string; endDate: string };
      comment?: string;
    };

    if (!periodA?.startDate || !periodA?.endDate) {
      return res.status(400).json({ error: 'periodA startDate and endDate are required' });
    }
    if (!periodB?.startDate || !periodB?.endDate) {
      return res.status(400).json({ error: 'periodB startDate and endDate are required' });
    }

    const original = await getTimeOffById(timeOffId);
    if (!original) {
      return res.status(404).json({ error: 'Time-off not found' });
    }
    if (!original.teamMemberId) {
      return res.status(400).json({ error: 'Time-off has no associated team member' });
    }

    const hasAuthority = await checkSupervisorAuthority(req,supervisorTeamMemberId, original.teamMemberId);
    if (!hasAuthority) {
      return res.status(403).json({ error: 'Not authorized to edit this time-off' });
    }

    if (original.statusId === SPLIT_STATUS_ID) {
      return res.status(400).json({ error: 'This time-off is already a split origin record' });
    }
    if (original.timeOffOriginalId !== null) {
      return res.status(400).json({ error: 'Cannot split a record that is already a split child' });
    }
    if (original.statusId === TIMEOFF_STATUS_IN_AUTH) {
      return res.status(400).json({ error: 'Cannot split a time-off request pending exception authorization' });
    }

    const cancelledStatus = await getStatusByName('cancelled');
    if (cancelledStatus && original.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Cannot convert a cancelled time-off' });
    }

    if (!original.categoryId) {
      return res.status(400).json({ error: 'Time-off record has no category' });
    }

    const categoryId = original.categoryId;
    const teamMemberId = original.teamMemberId;

    const authReq = req as ResolvedAuthRequest;
    const requestedByEmail = authReq.user?.email;
    if (!requestedByEmail || userId === null) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const [validationA, validationB] = await Promise.all([
      validateTimeOff({
        teamMemberId,
        categoryId,
        timeOffStartDate: new Date(periodA.startDate),
        timeOffEndDate: new Date(periodA.endDate),
        statusId: DEFAULTS.STATUS_ID,
        timeOffId,
      }),
      validateTimeOff({
        teamMemberId,
        categoryId,
        timeOffStartDate: new Date(periodB.startDate),
        timeOffEndDate: new Date(periodB.endDate),
        statusId: DEFAULTS.STATUS_ID,
        timeOffId,
      }),
    ]);

    // A leg that fails ONLY the days-before notice policy goes InAuth instead of
    // blocking the whole split. Any other failure (alone or combined) still blocks both legs.
    if (!validationA.valid && !isOnlyDaysBeforeNoticeFailure(validationA.errors)) {
      return res.status(400).json({ error: 'Period 1 validation failed', details: validationA.errors });
    }
    if (!validationB.valid && !isOnlyDaysBeforeNoticeFailure(validationB.errors)) {
      return res.status(400).json({ error: 'Period 2 validation failed', details: validationB.errors });
    }

    const legAIsException = !validationA.valid;
    const legBIsException = !validationB.valid;

    const [{ totalDays: daysA }, { totalDays: daysB }] = await Promise.all([
      calculateTimeOffDaysForTeamMember(teamMemberId, categoryId, new Date(periodA.startDate), new Date(periodA.endDate)),
      calculateTimeOffDaysForTeamMember(teamMemberId, categoryId, new Date(periodB.startDate), new Date(periodB.endDate)),
    ]);

    const now = new Date();
    const vacationPeriod = await resolveVacationPeriod(teamMemberId, categoryId);

    const pendingStatus = await getStatusByName('tentative');
    const pendingStatusId = pendingStatus?.statusId ?? DEFAULTS.STATUS_ID;

    const legAStatusId = legAIsException ? TIMEOFF_STATUS_IN_AUTH : pendingStatusId;
    const legBStatusId = legBIsException ? TIMEOFF_STATUS_IN_AUTH : pendingStatusId;

    const [createdA, createdB] = await prisma.$transaction(async (tx) => {
      await tx.timeOff.update({
        where: { timeOffId },
        data: { statusId: SPLIT_STATUS_ID },
      });

      const a = await tx.timeOff.create({
        data: {
          teamMemberId,
          timeOffStartDate: new Date(periodA.startDate),
          timeOffEndDate: new Date(periodA.endDate),
          timeOffDays: daysA,
          timeOffCreatedBy: userId,
          timeOffCreatedDate: now,
          categoryId,
          statusId: legAStatusId,
          timeOffIsException: legAIsException,
          timeOffOriginalId: timeOffId,
          timeOffPeriod: vacationPeriod,
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
          statusId: legBStatusId,
          timeOffIsException: legBIsException,
          timeOffOriginalId: timeOffId,
          timeOffPeriod: vacationPeriod,
        },
      });

      return [a, b] as const;
    });

    const defaultLogComment = comment?.trim() || 'SV vacation converted to split by supervisor from edit page';
    const logCommentA = legAIsException
      ? 'Split Period A saved pending exception authorization (insufficient notice)'
      : defaultLogComment;
    const logCommentB = legBIsException
      ? 'Split Period B saved pending exception authorization (insufficient notice)'
      : defaultLogComment;

    const [rawOriginal, rawA, rawB] = await Promise.all([
      fetchRawTimeOffRow(timeOffId),
      fetchRawTimeOffRow(createdA.timeOffId),
      fetchRawTimeOffRow(createdB.timeOffId),
    ]);

    await Promise.all([
      createTimeOffChangeLog({
        timeOffId,
        comment: defaultLogComment,
        oldValues: rawOriginal,
        newValues: rawOriginal,
        createdByUserId: userId,
      }),
      createTimeOffChangeLog({
        timeOffId: createdA.timeOffId,
        comment: logCommentA,
        oldValues: null,
        newValues: rawA,
        createdByUserId: userId,
      }),
      createTimeOffChangeLog({
        timeOffId: createdB.timeOffId,
        comment: logCommentB,
        oldValues: null,
        newValues: rawB,
        createdByUserId: userId,
      }),
    ]);

    await Promise.all([
      auditOrchestrator.log({
        entityName: 'tbl_tms_time_off',
        entityId: String(timeOffId),
        createdBy: authReq.user?.email ?? 'unknown',
        oldValues: { statusId: original.statusId } as Record<string, unknown>,
        newValues: { statusId: SPLIT_STATUS_ID } as Record<string, unknown>,
        comment: `Original 15-day SV vacation converted to split origin by supervisor via edit page`,
      }),
      auditOrchestrator.log({
        entityName: 'tbl_tms_time_off',
        entityId: String(createdA.timeOffId),
        createdBy: authReq.user?.email ?? 'unknown',
        oldValues: null,
        newValues: createdA as unknown as Record<string, unknown>,
        comment: legAIsException
          ? `Split Period A created by supervisor pending exception authorization — linked to origin ${timeOffId}`
          : `Split Period A created by supervisor from edit — linked to origin ${timeOffId}`,
      }),
      auditOrchestrator.log({
        entityName: 'tbl_tms_time_off',
        entityId: String(createdB.timeOffId),
        createdBy: authReq.user?.email ?? 'unknown',
        oldValues: null,
        newValues: createdB as unknown as Record<string, unknown>,
        comment: legBIsException
          ? `Split Period B created by supervisor pending exception authorization — linked to origin ${timeOffId}`
          : `Split Period B created by supervisor from edit — linked to origin ${timeOffId}`,
      }),
    ]);

    // Start an independent exception-authorization workflow for each leg that needs one.
    if (legAIsException) {
      await instantiateExceptionAuthorizationWorkflow({
        timeOffId: createdA.timeOffId,
        requestedByUserId: userId,
        requestedByEmail,
        contextJson: buildDaysBeforeContextJson(validationA.errors),
      });
    }
    if (legBIsException) {
      await instantiateExceptionAuthorizationWorkflow({
        timeOffId: createdB.timeOffId,
        requestedByUserId: userId,
        requestedByEmail,
        contextJson: buildDaysBeforeContextJson(validationB.errors),
      });
    }

    try {
      const employeeUserIds = await getUserIdsByTeamMemberIds([teamMemberId]);
      const employeeUserId = employeeUserIds[0];

      const category = await prisma.timeOffCategory.findUnique({
        where: { categoryId },
        select: { categoryName: true },
      });
      const categoryLabel = category?.categoryName ?? 'time-off';

      if (employeeUserId !== undefined) {
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
            description: `converted your time-off to a split ${categoryLabel}`,
            link: `/timeoff-detail/${createdA.timeOffId}`,
            day: 'Today',
            info: `${formatDateDDMMYYYY(periodA.startDate)} to ${formatDateDDMMYYYY(periodB.endDate)}`,
            sourceId: createdA.timeOffId,
            sourceEntity: 'TimeOff',
            isActionable: true,
          },
          recipients: [{ userId: employeeUserId, actionType: 'actionable' }],
        });
      }
    } catch (notifErr) {
      console.error('[TimeOff] Failed to notify employee on supervisor convert-to-split:', notifErr);
    }

    res.status(201).json({ data: { originId: timeOffId, periodA: createdA, periodB: createdB } });
  } catch (err) {
    console.error('[TimeOff] Error converting time-off to split by supervisor:', err);
    res.status(500).json({ error: 'Failed to convert time-off to split' });
  }
});

export default router;
