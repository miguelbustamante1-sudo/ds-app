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
import { createTimeOffChangeLog, getTimeOffChangeLog } from '../../services/timeoff/changelog';
import { calculateTimeOffDaysForTeamMember } from '../../services/timeoff/dayCalculation';
import { getStatusByName } from '../../db/timeOffStatuses';
import { resolveAuthUser, parseIdParam, type ResolvedAuthRequest } from './helpers';
import { acknowledgeTimeOff } from '../../services/timeoff/components/AcknowledgeTimeOff';
import { declineTimeOff } from '../../services/timeoff/components/DeclineTimeOff';
import { getWorkdayBalance } from '../../services/timeoff/components/GetWorkdayBalance';
import { notifySupervisorNewRequest } from '../../services/timeoff/components/NotifySupervisorNewRequest';
import { adjustWorkdayBalance } from '../../services/timeoff/components/AdjustWorkdayBalance';
import { verifySupervisorRelationship } from '../../services/timeoff/supervisor';
import { validateCancellationDaysBefore } from '../../services/timeoff/components/ValidateCancellationDaysBefore';
import { prisma } from '../../db/prisma';
import type { TimeOffDetailDTO } from '../../../shared/dto/TimeOff';

const router = express.Router();

// GET / (was /my-requests)
router.get('/', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const timeOffs = await getMyTimeOffs(teamMemberId);
    res.json(timeOffs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch time offs' });
  }
});

// GET /detail/:timeOffId — unified detail page for owner and supervisor
router.get('/detail/:timeOffId', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;

    const timeOffId = parseIdParam(req.params.timeOffId);
    if (timeOffId === null) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    // Determine caller's role
    let role: 'owner' | 'supervisor';
    if (timeOff.teamMemberId === teamMemberId) {
      role = 'owner';
    } else if (timeOff.teamMemberId && await verifySupervisorRelationship(teamMemberId, timeOff.teamMemberId)) {
      role = 'supervisor';
    } else {
      return res.status(403).json({ error: 'Not authorized to view this time-off' });
    }

    // Fetch related data
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
            select: { teamMemberNames: true, teamMemberSurnames: true, teamMemberKnownAs: true },
          })
        : null,
      getTimeOffChangeLog(timeOffId),
    ]);

    const teamMemberName = teamMember?.teamMemberKnownAs
      || `${teamMember?.teamMemberNames ?? ''} ${teamMember?.teamMemberSurnames ?? ''}`.trim()
      || 'Unknown';

    // Compute available actions based on status and role
    let availableActions: TimeOffDetailDTO['availableActions'] = [];
    if (timeOff.statusId === 1) { // Tentative
      if (role === 'owner') {
        availableActions = ['acknowledge', 'decline', 'cancel'];
      } else {
        availableActions = ['cancel'];
      }
    } else if (timeOff.statusId === 5) { // Rejected — only supervisor can cancel
      if (role === 'supervisor') {
        availableActions = ['cancel'];
      }
    }

    const detail: TimeOffDetailDTO = {
      timeOffId: timeOff.timeOffId,
      timeOffStartDate: timeOff.timeOffStartDate,
      timeOffEndDate: timeOff.timeOffEndDate,
      timeOffDays: Number(timeOff.timeOffDays),
      categoryId: timeOff.categoryId,
      categoryName: category?.categoryName ?? 'Unknown',
      statusId: timeOff.statusId,
      statusName: status?.statusName ?? 'Unknown',
      teamMemberName,
      role,
      availableActions,
      changeLogs: changeLogs.map((log) => ({
        changeLogId: log.changeLogId,
        changeLogComment: log.changeLogComment,
        changeLogCreatedBy: log.changeLogCreatedBy,
        changeLogCreatedDate: log.changeLogCreatedDate,
        createdByUserName: log.createdByUserName ?? null,
      })),
    };

    return res.json(detail);
  } catch (err) {
    console.error('[TimeOff] Error fetching time-off detail:', err);
    res.status(500).json({ error: 'Failed to fetch time-off detail' });
  }
});

// PATCH /detail/:timeOffId/acknowledge — owner only
router.patch('/detail/:timeOffId/acknowledge', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId } = req as ResolvedAuthRequest;

    const timeOffId = parseIdParam(req.params.timeOffId);
    if (timeOffId === null) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { recipientId } = req.body as { recipientId?: number };
    if (!recipientId || typeof recipientId !== 'number') {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    if (!resolvedUserId) {
      return res.status(400).json({ error: 'Could not resolve user' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    if (timeOff.teamMemberId !== teamMemberId) {
      return res.status(403).json({ error: 'Only the owner can acknowledge a time-off' });
    }

    if (timeOff.statusId !== 1) {
      return res.status(400).json({ error: 'Action already taken on this time-off' });
    }

    await acknowledgeTimeOff(timeOffId, recipientId, resolvedUserId);
    res.status(204).send();
  } catch (err) {
    console.error('[TimeOff] Error acknowledging time-off from detail:', err);
    res.status(500).json({ error: 'Failed to acknowledge time-off' });
  }
});

// PATCH /detail/:timeOffId/decline — owner only
router.patch('/detail/:timeOffId/decline', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId } = req as ResolvedAuthRequest;

    const timeOffId = parseIdParam(req.params.timeOffId);
    if (timeOffId === null) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { recipientId, comment } = req.body as { recipientId?: number; comment?: string };
    if (!recipientId || typeof recipientId !== 'number') {
      return res.status(400).json({ error: 'recipientId is required' });
    }
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required for declining' });
    }

    if (!resolvedUserId) {
      return res.status(400).json({ error: 'Could not resolve user' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    if (timeOff.teamMemberId !== teamMemberId) {
      return res.status(403).json({ error: 'Only the owner can decline a time-off' });
    }

    if (timeOff.statusId !== 1) {
      return res.status(400).json({ error: 'Action already taken on this time-off' });
    }

    await declineTimeOff(timeOffId, recipientId, resolvedUserId);
    res.status(204).send();
  } catch (err) {
    console.error('[TimeOff] Error declining time-off from detail:', err);
    res.status(500).json({ error: 'Failed to decline time-off' });
  }
});

// PATCH /detail/:timeOffId/cancel — owner or supervisor
router.patch('/detail/:timeOffId/cancel', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;

    const timeOffId = parseIdParam(req.params.timeOffId);
    if (timeOffId === null) {
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

    // Determine role — owner or supervisor
    const isOwner = timeOff.teamMemberId === teamMemberId;
    const isSupervisor = !isOwner && timeOff.teamMemberId
      ? await verifySupervisorRelationship(teamMemberId, timeOff.teamMemberId)
      : false;

    if (!isOwner && !isSupervisor) {
      return res.status(403).json({ error: 'Not authorized to cancel this time-off' });
    }

    // Only Tentative (1) and Rejected (5) can be cancelled
    if (timeOff.statusId !== 1 && timeOff.statusId !== 5) {
      return res.status(400).json({ error: 'Action already taken on this time-off' });
    }

    // Rejected time-offs can only be cancelled by a supervisor
    if (timeOff.statusId === 5 && !isSupervisor) {
      return res.status(403).json({ error: 'Only supervisors can cancel a rejected time-off' });
    }

    const cancelledStatus = await getStatusByName('cancelled');
    if (!cancelledStatus) {
      return res.status(500).json({ error: 'Cancelled status not found in system' });
    }

    const oldDays = Number(timeOff.timeOffDays);
    const employeeTeamMemberId = timeOff.teamMemberId!;

    const categoryRecord = timeOff.categoryId
      ? await prisma.timeOffCategory.findUnique({ where: { categoryId: timeOff.categoryId }, select: { categoryName: true } })
      : null;
    const categoryName = categoryRecord?.categoryName ?? '';

    await updateTimeOff(
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

    const createdBy = (req as ResolvedAuthRequest).user?.email ?? 'unknown';
    try {
      await adjustWorkdayBalance(employeeTeamMemberId, categoryName, -oldDays, createdBy);
    } catch (balanceErr) {
      console.error('[TimeOff] Failed to restore balance on detail cancel:', balanceErr);
    }

    res.status(204).send();
  } catch (err) {
    console.error('[TimeOff] Error cancelling time-off from detail:', err);
    res.status(500).json({ error: 'Failed to cancel time-off' });
  }
});

// GET /workday-balance
router.get('/workday-balance', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const balance = await getWorkdayBalance(teamMemberId);
    res.json(balance);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workday balance' });
  }
});

// GET /:timeOffId — fetch a single time-off by ID (ownership check)
router.get('/:timeOffId', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId } = req as ResolvedAuthRequest;
    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff || timeOff.teamMemberId !== teamMemberId) {
      return res.status(404).json({ message: 'Time-off not found' });
    }

    return res.json(timeOff);
  } catch (err) {
    console.error('[TimeOff] Error fetching time-off by id:', err);
    res.status(500).json({ error: 'Failed to fetch time-off' });
  }
});

// PATCH /:timeOffId/acknowledge
router.patch('/:timeOffId/acknowledge', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId } = req as ResolvedAuthRequest;

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { recipientId } = req.body as { recipientId?: number };
    if (!recipientId || typeof recipientId !== 'number') {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    if (!resolvedUserId) {
      return res.status(400).json({ error: 'Could not resolve user' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    if (timeOff.teamMemberId !== teamMemberId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (timeOff.statusId !== 1) {
      return res.status(400).json({ error: 'Time-off is no longer pending' });
    }

    await acknowledgeTimeOff(timeOffId, recipientId, resolvedUserId);
    res.status(204).send();
  } catch (err) {
    console.error('[TimeOff] Error acknowledging time-off:', err);
    res.status(500).json({ error: 'Failed to acknowledge time-off' });
  }
});

// PATCH /:timeOffId/decline
router.patch('/:timeOffId/decline', requirePermission('TimeOffs', 'read'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId } = req as ResolvedAuthRequest;

    const timeOffId = Number(req.params.timeOffId);
    if (Number.isNaN(timeOffId)) {
      return res.status(400).json({ error: 'Invalid time-off id' });
    }

    const { recipientId } = req.body as { recipientId?: number };
    if (!recipientId || typeof recipientId !== 'number') {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    if (!resolvedUserId) {
      return res.status(400).json({ error: 'Could not resolve user' });
    }

    const timeOff = await getTimeOffById(timeOffId);
    if (!timeOff) {
      return res.status(404).json({ error: 'Time-off not found' });
    }

    if (timeOff.teamMemberId !== teamMemberId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (timeOff.statusId !== 1) {
      return res.status(400).json({ error: 'Time-off is no longer pending' });
    }

    await declineTimeOff(timeOffId, recipientId, resolvedUserId);
    res.status(204).send();
  } catch (err) {
    console.error('[TimeOff] Error declining time-off:', err);
    res.status(500).json({ error: 'Failed to decline time-off' });
  }
});

// PATCH /:timeOffId/cancel (was /my-requests/:timeOffId/cancel)
router.patch('/:timeOffId/cancel', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;
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

    if (timeOff.teamMemberId !== teamMemberId) {
      return res.status(403).json({ error: 'Not authorized to cancel this time-off' });
    }

    const dateValidation = await validateCancellationDaysBefore({
      startDate: timeOff.timeOffStartDate,
      categoryId: timeOff.categoryId,
      teamMemberId,
    });

    if (!dateValidation.valid) {
      return res.status(400).json({
        error: `This time-off can no longer be self-cancelled. Cancellations must be requested at least ${dateValidation.requiredDaysBefore} day(s) before the start date.`,
      });
    }

    const cancelledStatus = await getStatusByName('cancelled');
    if (!cancelledStatus) {
      return res.status(500).json({ error: 'Cancelled status not found in system' });
    }

    if (timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Time-off is already cancelled' });
    }

    if (timeOff.statusId === 5) { // Rejected
      return res.status(403).json({ error: 'Only supervisors can cancel a rejected time-off' });
    }

    const oldDays = Number(timeOff.timeOffDays);

    const [categoryRecord] = await Promise.all([
      timeOff.categoryId
        ? prisma.timeOffCategory.findUnique({ where: { categoryId: timeOff.categoryId }, select: { categoryName: true } })
        : null,
    ]);
    const categoryName = categoryRecord?.categoryName ?? '';

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

    await createTimeOffChangeLog({
      timeOffId,
      comment: comment.trim(),
      oldValues: { statusId: timeOff.statusId },
      newValues: { statusId: cancelledStatus.statusId },
      createdByUserId: userId,
    });

    try {
      await adjustWorkdayBalance(teamMemberId, categoryName, -oldDays, createdBy);
    } catch (balanceErr) {
      console.error('[TimeOff] Failed to restore balance on employee cancel:', balanceErr);
    }

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error cancelling own time-off:', err);
    res.status(500).json({ error: 'Failed to cancel time-off' });
  }
});

// PATCH /:timeOffId (was /my-requests/:timeOffId)
router.patch('/:timeOffId', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;
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

    if (timeOff.teamMemberId !== teamMemberId) {
      return res.status(403).json({ error: 'Not authorized to edit this time-off' });
    }

    const cancelledStatus = await getStatusByName('cancelled');
    if (cancelledStatus && timeOff.statusId === cancelledStatus.statusId) {
      return res.status(400).json({ error: 'Cannot edit a cancelled time-off request' });
    }

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

    const oldDays = Number(timeOff.timeOffDays);

    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
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
      teamMemberId,
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

    try {
      const delta = totalDays - oldDays;
      await adjustWorkdayBalance(teamMemberId, categoryName, delta, createdBy);
    } catch (balanceErr) {
      console.error('[TimeOff] Failed to adjust balance on edit:', balanceErr);
    }

    res.json(updated);
  } catch (err) {
    console.error('[TimeOff] Error editing own time-off:', err);
    res.status(500).json({ error: 'Failed to edit time-off' });
  }
});

// POST /split — Atomic SV vacation split: creates two time-off requests in a single transaction
router.post('/split', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;
    const createdBy = (req as ResolvedAuthRequest).user?.email ?? 'unknown';

    const { categoryId, periodA, periodB, comment } = req.body as {
      categoryId?: number;
      periodA?: { startDate: string; endDate: string };
      periodB?: { startDate: string; endDate: string };
      comment?: string;
    };

    if (categoryId === undefined || categoryId === null) {
      return res.status(400).json({ error: 'categoryId is required' });
    }
    if (!periodA?.startDate || !periodA?.endDate) {
      return res.status(400).json({ error: 'periodA startDate and endDate are required' });
    }
    if (!periodB?.startDate || !periodB?.endDate) {
      return res.status(400).json({ error: 'periodB startDate and endDate are required' });
    }

    const effectiveStatusId = DEFAULTS.STATUS_ID;

    // Validate each period independently — SV rule allows 7, 8, or 15 days when 0 existing days
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

    // Calculate days for each period
    const [{ totalDays: daysA }, { totalDays: daysB }] = await Promise.all([
      calculateTimeOffDaysForTeamMember(teamMemberId, categoryId, new Date(periodA.startDate), new Date(periodA.endDate)),
      calculateTimeOffDaysForTeamMember(teamMemberId, categoryId, new Date(periodB.startDate), new Date(periodB.endDate)),
    ]);

    const now = new Date();

    // Atomic save — both periods succeed or both are rolled back
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

    const logComment = comment?.trim() || 'SV vacation split request created';

    await Promise.all([
      createTimeOffChangeLog({
        timeOffId: createdA.timeOffId,
        comment: logComment,
        oldValues: {},
        newValues: { timeOffStartDate: periodA.startDate, timeOffEndDate: periodA.endDate, categoryId, statusId: effectiveStatusId },
        createdByUserId: userId,
      }),
      createTimeOffChangeLog({
        timeOffId: createdB.timeOffId,
        comment: logComment,
        oldValues: {},
        newValues: { timeOffStartDate: periodB.startDate, timeOffEndDate: periodB.endDate, categoryId, statusId: effectiveStatusId },
        createdByUserId: userId,
      }),
    ]);

    // Notify supervisor and adjust balance (best-effort — failure does not block creation)
    const authReq = req as ResolvedAuthRequest;
    const employeeName = authReq.user?.firstName
      ? `${authReq.user.firstName} ${authReq.user.lastName ?? ''}`.trim()
      : 'A team member';

    try {
      const category = await prisma.timeOffCategory.findUnique({
        where: { categoryId },
        select: { categoryName: true },
      });
      const categoryLabel = category?.categoryName ?? 'time-off';

      await notifySupervisorNewRequest({
        teamMemberId,
        timeOffId: createdA.timeOffId,
        timeOffStartDate: periodA.startDate,
        timeOffEndDate: periodA.endDate,
        employeeName,
        categoryName: categoryLabel,
      });

      await adjustWorkdayBalance(teamMemberId, categoryLabel, daysA, createdBy);
      await adjustWorkdayBalance(teamMemberId, categoryLabel, daysB, createdBy);
    } catch (notifErr) {
      console.error('[TimeOff] Failed to notify supervisor or adjust balance on split create:', notifErr);
    }

    res.status(201).json({ periodA: createdA, periodB: createdB });
  } catch (err) {
    console.error('[TimeOff] Error creating split vacation:', err);
    res.status(500).json({ error: 'Failed to create split vacation requests' });
  }
});

// POST / (was /my-requests)
router.post('/', requirePermission('TimeOffs', 'create'), resolveAuthUser, async (req, res: Response) => {
  try {
    const { teamMemberId, resolvedUserId: userId } = req as ResolvedAuthRequest;

    const { timeOffStartDate, timeOffEndDate, categoryId, comment, warningReviewComment } = req.body as {
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number;
      comment?: string;
      warningReviewComment?: string;
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

    if (warningReviewComment) {
      console.log(`[TimeOff] Warning review comment for teamMemberId ${teamMemberId}:`, warningReviewComment);
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
      comment: comment || 'Time-off request created',
      oldValues: {},
      newValues: { timeOffStartDate, timeOffEndDate, categoryId, statusId: effectiveStatusId },
      createdByUserId: userId,
    });

    // Notify supervisor & adjust balance (best-effort — failure does not block creation)
    const authReq = req as ResolvedAuthRequest;
    const employeeName = authReq.user?.firstName
      ? `${authReq.user.firstName} ${authReq.user.lastName ?? ''}`.trim()
      : 'A team member';
    const createdBy = authReq.user?.email ?? 'unknown';

    try {
      const category = await prisma.timeOffCategory.findUnique({
        where: { categoryId },
        select: { categoryName: true },
      });
      const categoryLabel = category?.categoryName ?? 'time-off';

      await notifySupervisorNewRequest({
        teamMemberId,
        timeOffId: created.timeOffId,
        timeOffStartDate,
        timeOffEndDate,
        employeeName,
        categoryName: categoryLabel,
      });

      await adjustWorkdayBalance(teamMemberId, categoryLabel, totalDays, createdBy);
    } catch (notifErr) {
      console.error('[TimeOff] Failed to notify supervisor or adjust balance on create:', notifErr);
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create time off' });
  }
});

export default router;
