import { Router, Response } from 'express';
import { validateApiKey } from '../../middleware/apiKey';
import { requirePermission, type AuthenticatedRequest } from '../../middleware/auth';
import { getActiveTimeOffsByWorkdayId } from '../../services/timeoff/external/GetActiveTimeOffsByWorkdayId';
import { getTimeOffFeed } from '../../services/timeoff/external/getTimeOffFeed';
import { getTimeOffDriftCheck } from '../../services/timeoff/external/getTimeOffDriftCheck';
import { AppError } from '../../errors/AppError';
import { catchHandler } from '../routeUtils';
import type { DriftCheckRequestDTO } from '@shared/dto/TimeOffExternalDriftCheck';

const router = Router();

// GET /api/time-offs/external/by-workday-id/:wdid
router.get(
  '/by-workday-id/:wdid',
  validateApiKey,
  requirePermission('TimeOffLookup', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const wdid = req.params['wdid'] ?? '';
      const timeOffs = await getActiveTimeOffsByWorkdayId(wdid);
      res.json({ data: timeOffs });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// GET /api/time-offs/external/feed?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get(
  '/feed',
  validateApiKey,
  requirePermission('TimeOffExternalFeed', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      if (typeof startDate !== 'string' || typeof endDate !== 'string') {
        throw new AppError('startDate and endDate are required', 400);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new AppError('startDate and endDate must be valid dates', 400);
      }
      if (start > end) {
        throw new AppError('startDate must not be after endDate', 400);
      }

      const feed = await getTimeOffFeed(start, end);
      res.json({ data: feed });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// POST /api/time-offs/external/drift-check
router.post(
  '/drift-check',
  validateApiKey,
  requirePermission('TimeOffExternalDriftCheck', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body ?? {}) as DriftCheckRequestDTO;
      if (!body.workdayId || typeof body.workdayId !== 'string') {
        throw new AppError('workdayId is required', 400);
      }
      if (!body.date || typeof body.date !== 'string') {
        throw new AppError('date is required', 400);
      }

      const date = new Date(body.date);
      if (Number.isNaN(date.getTime())) {
        throw new AppError('date must be a valid date', 400);
      }

      const result = await getTimeOffDriftCheck(body.workdayId, date);
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
