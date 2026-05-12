import { Router } from 'express';
import type { Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import {
  getAllVacationPeriodRecords,
  updateVacationPeriodRecord,
} from '../services/timeoff/maintenance/VacationPeriodMaintenanceService';
import type { UpdateTimeOffPeriodMaintenanceDTO } from '../../shared/dto/TimeOffPeriodMaintenance';

const router = Router();

router.get('/', requirePermission('TimeOffPeriodMaintenance', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const records = await getAllVacationPeriodRecords();
    res.json({ data: records });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.put('/:id', requirePermission('TimeOffPeriodMaintenance', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const { timeOffPeriod, timeOffBackfilled } = req.body as UpdateTimeOffPeriodMaintenanceDTO;

    if (timeOffBackfilled !== 0 && timeOffBackfilled !== 1) {
      res.status(400).json({ error: 'timeOffBackfilled must be 0 or 1' });
      return;
    }

    const updated = await updateVacationPeriodRecord(
      id,
      { timeOffPeriod: timeOffPeriod ?? null, timeOffBackfilled },
      req.user?.email ?? 'unknown'
    );

    res.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
