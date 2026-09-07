import express from 'express';
import type { Response } from 'express';
import type { TimeOff } from '@prisma/client';
import {
  getAllTimeOffs,
  getTimeOffById,
  getTimeOffsByTeamMemberId,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff,
} from '../../db/timeOffs';
import { requirePermission, type AuthenticatedRequest } from '../../middleware/auth';
import { validateTimeOff, DEFAULTS } from '../../services/timeoff/validation';
import { calculateTimeOffDaysForTeamMember } from '../../services/timeoff/dayCalculation';
import { parseIdParam } from './helpers';
import { resolveVacationPeriod } from '../../services/timeoff/utils/resolveVacationPeriod';

const router = express.Router();

// GET /
router.get('/', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeOffs: TimeOff[] = await getAllTimeOffs();
    res.json(timeOffs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch time offs' });
  }
});

// GET /:id
router.get('/:id', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid id' });

    const timeOff = await getTimeOffById(id);
    if (!timeOff) return res.status(404).json({ error: 'Time off not found' });

    res.json(timeOff);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch time off' });
  }
});

// GET /team-member/:teamMemberId
router.get(
  '/team-member/:teamMemberId',
  requirePermission('TimeOffs', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = parseIdParam(req.params.teamMemberId);
      if (teamMemberId === null)
        return res.status(400).json({ error: 'Invalid team member id' });

      const timeOffs = await getTimeOffsByTeamMemberId(teamMemberId);
      res.json(timeOffs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch time offs for team member' });
    }
  }
);

// POST /
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

    if (warningReviewComment) {
      console.log(`[TimeOff] Warning review comment for teamMemberId ${teamMemberId}:`, warningReviewComment);
    }

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

    const effectiveStatusId = statusId ?? DEFAULTS.STATUS_ID;

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

    const vacationPeriod = await resolveVacationPeriod(teamMemberId, categoryId);

    const created = await createTimeOff(
      teamMemberId,
      timeOffStartDate,
      timeOffEndDate,
      req.user?.id ?? null,
      new Date().toISOString(),
      categoryId,
      effectiveStatusId,
      totalDays,
      undefined,
      undefined,
      vacationPeriod
    );
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create time off' });
  }
});

// PUT /:id
router.put('/:id', requirePermission('TimeOffs', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid id' });

    const { teamMemberId, timeOffStartDate, timeOffEndDate, categoryId, statusId } = req.body as {
      teamMemberId?: number | null;
      timeOffStartDate?: string;
      timeOffEndDate?: string;
      categoryId?: number | null;
      statusId?: number | null;
    };

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

    const effectiveStatusId = statusId ?? DEFAULTS.STATUS_ID;

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

    const { totalDays } = await calculateTimeOffDaysForTeamMember(
      teamMemberId,
      categoryId,
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

// DELETE /:id
router.delete(
  '/:id',
  requirePermission('TimeOffs', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseIdParam(req.params.id);
      if (id === null) return res.status(400).json({ error: 'Invalid id' });

      await deleteTimeOff(id);

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete time off' });
    }
  }
);

export default router;
