import express from 'express';
import type { Response } from 'express';
import { getHolidaysByCountry } from '../db/holidays';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import type { HolidayDTO } from '@shared/dto';

const router = express.Router();

/**
 * GET /api/time-off-holidays/:countryId
 * Returns all active holidays for the given country.
 * Protected by requirePermission('TimeOffs', 'read') — any time-off user
 * (employee + supervisor) already holds this permission.
 * Used by time-off forms to display holiday awareness notices and calendar highlighting.
 */
router.get('/:countryId', requirePermission('TimeOffs', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const countryId = Number(req.params.countryId);
    if (Number.isNaN(countryId)) {
      return res.status(400).json({ error: 'Invalid countryId' });
    }

    const holidays = await getHolidaysByCountry(countryId);

    const response: HolidayDTO[] = holidays.map((h) => ({
      holidayId: h.holidayId,
      countryId: h.countryId,
      holidayName: h.holidayName,
      holidayDate: h.holidayDate,
      holidayIsRecurring: h.holidayIsRecurring,
      holidayIsHalfDay: h.holidayIsHalfDay,
      holidayIsActive: h.holidayIsActive,
      holidayCreatedAt: h.holidayCreatedAt,
      holidayCreatedBy: h.holidayCreatedBy,
      holidayUpdatedAt: h.holidayUpdatedAt,
      holidayUpdatedBy: h.holidayUpdatedBy,
    }));

    return res.json(response);
  } catch (err) {
    error(err);
    return res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

export default router;
