import express from 'express';
import type { Response } from 'express';
import { getTimeOffById, getMyTimeOffs, createTimeOff, updateTimeOff } from '../../db/timeOffs';
import { getTimeOffChangeLog } from '../../services/timeoff/changelog';
import type { ExceptionTimeOffDetailDTO } from '@shared/dto/TimeOff';
import { requirePermission } from '../../middleware/auth';
import { validateExceptionTimeOff } from '../../services/timeoff/validation/exceptionValidation';
import { DEFAULTS } from '../../services/timeoff/validation';
import { createTimeOffChangeLog } from '../../services/timeoff/changelog';
import { calculateTimeOffDaysForTeamMember } from '../../services/timeoff/dayCalculation';
import { getStatusByName } from '../../db/timeOffStatuses';
import { resolveAuthUser, parseIdParam, type ResolvedAuthRequest } from './helpers';
import { notificationOrchestrator } from '../../services/notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../services/notifications/repository';
import { prisma } from '../../db/prisma';
import { formatDateDDMMYYYY } from '../../services/timeoff/components/FormatDateDDMMYYYY';
import { computeTimeOffIsException } from '../../services/timeoff/components/ComputeTimeOffIsException';
import { auditOrchestrator } from '../../services/audit/AuditOrchestrator';

const router = express.Router();

// GET /exception/:timeOffId/detail — read-only detail for exception admins, no hierarchy check
router.get('/:timeOffId/detail', requirePermission('TimeOffException', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const timeOffId = parseIdParam(req.params.timeOffId);
    if (timeOffId === null) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    const [category, status, teamMember, changeLogs] = await Promise.all([
      timeOff.categoryId
        ? prisma.timeOffCategory.findUnique({ where: { categoryId: timeOff.categoryId }, select: { categoryName: true } })
        : null,
      timeOff.statusId
        ? prisma.timeOffStatus.findUnique({ where: { statusId: timeOff.statusId }, select: { statusName: true } })
        : null,
      timeOff.teamMemberId
        ? prisma.teamMember.findUnique({
            where: { teamMemberId: timeOff.teamMemberId },
            select: { teamMemberNames: true, teamMemberSurnames: true },
          })
        : null,
      getTimeOffChangeLog(timeOffId),
    ]);

    const teamMemberName = teamMember
      ? `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`.trim()
      : 'Unknown';

    const creationLog = changeLogs.find(
      (log) => log.changeLogOldValues === null || (typeof log.changeLogOldValues === 'object' && Object.keys(log.changeLogOldValues as object).length === 0)
    );
    const regularLogs = changeLogs.filter((log) => log.changeLogId !== creationLog?.changeLogId);

    const detail: ExceptionTimeOffDetailDTO = {
      timeOffId: timeOff.timeOffId,
      timeOffStartDate: timeOff.timeOffStartDate,
      timeOffEndDate: timeOff.timeOffEndDate,
      timeOffDays: Number(timeOff.timeOffDays),
      categoryId: timeOff.categoryId,
      categoryName: category?.categoryName ?? 'Unknown',
      statusId: timeOff.statusId,
      statusName: status?.statusName ?? 'Unknown',
      teamMemberName,
      creationComment: creationLog?.changeLogComment ?? null,
      changeLogs: regularLogs.map((log) => ({
        changeLogId: log.changeLogId,
        changeLogComment: log.changeLogComment,
        changeLogCreatedBy: log.changeLogCreatedBy,
        changeLogCreatedDate: log.changeLogCreatedDate,
        createdByUserName: log.createdByUserName ?? null,
      })),
    };

    return res.json(detail);
  } catch (err) {
    console.error('[Exception] Error fetching time-off detail:', err);
    res.status(500).json({ error: 'Failed to fetch time-off detail' });
  }
});

// GET /exception/team-member/:teamMemberId
router.get('/team-member/:teamMemberId', requirePermission('TimeOffException', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const teamMemberId = parseIdParam(req.params.teamMemberId);
    if (teamMemberId === null) {
      return res.status(400).json({ error: 'Invalid team member id' });
    }

    const timeOffs = await getMyTimeOffs(teamMemberId);
    res.json(timeOffs);
  } catch (err) {
    console.error('[Exception] Error fetching team member time-offs:', err);
    res.status(500).json({ error: 'Failed to fetch time-offs for team member' });
  }
});

// POST /exception/request
router.post('/request', requirePermission('TimeOffException', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { resolvedUserId: userId } = req as ResolvedAuthRequest;

    const { teamMemberId, timeOffStartDate, timeOffEndDate, categoryId, comment } = req.body as {
      teamMemberId?: number;
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number;
      comment?: string;
    };

    if (!teamMemberId) return res.status(400).json({ error: 'teamMemberId is required' });
    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') return res.status(400).json({ error: 'timeOffStartDate is required' });
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') return res.status(400).json({ error: 'timeOffEndDate is required' });
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });

    const effectiveStatusId = DEFAULTS.STATUS_ID;

    const validationResult = await validateExceptionTimeOff({
      teamMemberId,
      categoryId,
      timeOffStartDate: new Date(timeOffStartDate),
      timeOffEndDate: new Date(timeOffEndDate),
      statusId: effectiveStatusId,
    });

    if (!validationResult.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.errors });
    }

    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
      categoryId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    const isException = await computeTimeOffIsException(teamMemberId, categoryId, totalDays);

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
      isException
    );

    await createTimeOffChangeLog({
      timeOffId: created.timeOffId,
      comment: comment || 'Time-off exception entry created by BSA',
      oldValues: null,
      newValues: { timeOffStartDate, timeOffEndDate, categoryId, statusId: effectiveStatusId },
      createdByUserId: userId,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(created.timeOffId),
      createdBy: (req as ResolvedAuthRequest).user?.email ?? 'unknown',
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Exception time-off entry created by BSA for team member ${teamMemberId}`,
    });

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
        const creatorName = authReq.user?.firstName
          ? `${authReq.user.firstName} ${authReq.user.lastName ?? ''}`.trim()
          : 'BSA';

        await notificationOrchestrator.create({
          categoryName: 'Inbox',
          itemType: 'item-3',
          payload: {
            userName: creatorName,
            avatar: '300-1.png',
            badgeColor: 'online',
            description: `created a ${categoryLabel} time-off exception entry for you`,
            link: `/timeoff-detail/${created.timeOffId}`,
            day: 'Today',
            info: `${formatDateDDMMYYYY(timeOffStartDate)} to ${formatDateDDMMYYYY(timeOffEndDate)}`,
            sourceId: created.timeOffId,
            sourceEntity: 'TimeOff',
          },
          recipients: [{ userId: employeeUserId, actionType: 'actionable' }],
        });
      }
    } catch (notifErr) {
      console.error('[Exception] Failed to create notification on exception create:', notifErr);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('[Exception] Error creating exception time-off:', err);
    res.status(500).json({ error: 'Failed to create exception time-off' });
  }
});

// PATCH /exception/:timeOffId
router.patch('/:timeOffId', requirePermission('TimeOffException', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { resolvedUserId: userId } = req as ResolvedAuthRequest;

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) return res.status(400).json({ error: 'Invalid time-off id' });

    const { timeOffStartDate, timeOffEndDate, categoryId, comment } = req.body as {
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number;
      comment?: string;
    };

    if (!timeOffStartDate || typeof timeOffStartDate !== 'string') return res.status(400).json({ error: 'timeOffStartDate is required' });
    if (!timeOffEndDate || typeof timeOffEndDate !== 'string') return res.status(400).json({ error: 'timeOffEndDate is required' });
    if (categoryId === undefined || categoryId === null) return res.status(400).json({ error: 'categoryId is required' });

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) return res.status(404).json({ error: 'Time-off not found' });
    if (!timeOff.teamMemberId) return res.status(400).json({ error: 'Time-off has no associated team member' });

    const cancelledStatus = await getStatusByName('cancelled');
    if (cancelledStatus && timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Cannot edit a cancelled time-off request' });
    }
    if (timeOff.statusId === 5) {
      return res.status(400).json({ error: 'Cannot edit a rejected time-off request' });
    }
    if (timeOff.statusId === 6) {
      return res.status(400).json({ error: 'Cannot edit a split origin record' });
    }

    const validationResult = await validateExceptionTimeOff({
      teamMemberId: timeOff.teamMemberId,
      categoryId,
      timeOffStartDate: new Date(timeOffStartDate),
      timeOffEndDate: new Date(timeOffEndDate),
      statusId: timeOff.statusId,
      timeOffId,
    });

    if (!validationResult.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.errors });
    }

    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      timeOff.teamMemberId,
      categoryId,
      new Date(timeOffStartDate),
      new Date(timeOffEndDate)
    );

    const isException = await computeTimeOffIsException(timeOff.teamMemberId, categoryId, totalDays);

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
      isException
    );

    await createTimeOffChangeLog({
      timeOffId,
      comment: comment || 'Time-off exception entry updated by BSA',
      oldValues: { timeOffStartDate: timeOff.timeOffStartDate, timeOffEndDate: timeOff.timeOffEndDate, categoryId: timeOff.categoryId },
      newValues: { timeOffStartDate, timeOffEndDate, categoryId },
      createdByUserId: userId,
    });

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(timeOffId),
      createdBy: (req as ResolvedAuthRequest).user?.email ?? 'unknown',
      oldValues: { timeOffStartDate: timeOff.timeOffStartDate, timeOffEndDate: timeOff.timeOffEndDate, categoryId: timeOff.categoryId },
      newValues: { timeOffStartDate, timeOffEndDate, categoryId },
      comment: `Exception time-off entry updated by BSA for team member ${timeOff.teamMemberId}`,
    });

    res.json(updated);
  } catch (err) {
    console.error('[Exception] Error updating exception time-off:', err);
    res.status(500).json({ error: 'Failed to update exception time-off' });
  }
});

// PATCH /exception/:timeOffId/cancel
router.patch('/:timeOffId/cancel', requirePermission('TimeOffException', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { resolvedUserId: userId } = req as ResolvedAuthRequest;

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) return res.status(400).json({ error: 'Invalid time-off id' });

    const { comment } = req.body as { comment?: string };
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required for cancellation' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) return res.status(404).json({ error: 'Time-off not found' });
    if (!timeOff.teamMemberId) return res.status(400).json({ error: 'Time-off has no associated team member' });

    const cancelledStatus = await getStatusByName('cancelled');
    if (!cancelledStatus) return res.status(500).json({ error: 'Cancelled status not found in system' });

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

    await auditOrchestrator.log({
      entityName: 'tbl_tms_time_off',
      entityId: String(timeOffId),
      createdBy: (req as ResolvedAuthRequest).user?.email ?? 'unknown',
      oldValues: { statusId: timeOff.statusId },
      newValues: { statusId: cancelledStatus.statusId },
      comment: `Time-off cancelled via exception page by BSA`,
    });

    res.json(updated);
  } catch (err) {
    console.error('[Exception] Error cancelling time-off:', err);
    res.status(500).json({ error: 'Failed to cancel time-off' });
  }
});

export default router;
