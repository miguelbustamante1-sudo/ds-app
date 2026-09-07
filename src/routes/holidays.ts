import express from 'express';
import type { Request, Response } from 'express';
import {
  getAllHolidaysWithCountry,
  getHolidaysByCountry,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from '../db/holidays';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import type { CreateHolidayDTO, UpdateHolidayDTO, HolidayDTO } from '@shared/dto';

const router = express.Router();

// GET /holidays (supports optional ?cou_id=)
router.get('/', requirePermission('Holidays', 'read'), async (req: Request, res: Response) => {
  try {
    const couIdQuery = req.query.cou_id;
    if (couIdQuery !== undefined) {
      const couId = Number(couIdQuery);
      if (Number.isNaN(couId)) return res.status(400).json({ error: 'Invalid cou_id' });
      const holidays = await getHolidaysByCountry(couId);
      return res.json(holidays);
    }

    const holidays = await getAllHolidaysWithCountry();
    const response: HolidayDTO[] = holidays.map((h: { holidayId: any; countryId: any; holidayName: any; holidayDate: any; holidayIsRecurring: any; holidayIsHalfDay: any; holidayCreatedAt: any; holidayCreatedBy: any; holidayUpdatedAt: any; holidayUpdatedBy: any; holidayIsActive: any; country: { countryName: any; }; }) => ({
      holidayId: h.holidayId,
      countryId: h.countryId,
      holidayName: h.holidayName,
      holidayDate: h.holidayDate,
      holidayIsRecurring: h.holidayIsRecurring,
      holidayIsHalfDay: h.holidayIsHalfDay,
      holidayCreatedAt: h.holidayCreatedAt,
      holidayCreatedBy: h.holidayCreatedBy,
      holidayUpdatedAt: h.holidayUpdatedAt,
      holidayUpdatedBy: h.holidayUpdatedBy,
      holidayIsActive: h.holidayIsActive,
      countryName: h.country?.countryName ?? null,
    }));
    res.json(response);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// GET /holidays/:id
router.get('/:id', requirePermission('Holidays', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const holiday = await getHolidayById(id);
    if (!holiday) return res.status(404).json({ error: 'Holiday not found' });

    res.json(holiday);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch holiday' });
  }
});

// GET /holidays/country/:cou_id
router.get('/country/:cou_id', requirePermission('Holidays', 'read'), async (req: Request, res: Response) => {
  try {
    const couId = Number(req.params.cou_id);
    if (Number.isNaN(couId)) return res.status(400).json({ error: 'Invalid cou_id' });

    const holidays = await getHolidaysByCountry(couId);
    res.json(holidays);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch holidays for country' });
  }
});

// POST /holidays
router.post('/', requirePermission('Holidays', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as CreateHolidayDTO;
    const { countryId, holidayName, holidayDate, holidayIsRecurring, holidayIsHalfDay } = body;

    if (!countryId || typeof countryId !== 'number') {
      return res.status(400).json({ error: 'countryId is required and must be a number' });
    }
    if (!holidayName || typeof holidayName !== 'string') {
      return res.status(400).json({ error: 'holidayName is required' });
    }
    if (!holidayDate) {
      return res.status(400).json({ error: 'holidayDate is required' });
    }

    const userEmail = req.user?.email || 'system';

    const created = await createHoliday({
      country: { connect: { countryId } },
      holidayName,
      holidayDate: new Date(holidayDate),
      holidayIsRecurring: holidayIsRecurring ?? true,
      holidayIsHalfDay: holidayIsHalfDay ?? false,
      holidayCreatedBy: userEmail,
      holidayCreatedAt: new Date(),
      holidayUpdatedAt: new Date(),
      holidayUpdatedBy: userEmail,
      holidayIsActive: true,
    });

    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

// PUT /holidays/:id
router.put('/:id', requirePermission('Holidays', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const body = req.body as UpdateHolidayDTO;
    const { countryId, holidayName, holidayDate, holidayIsRecurring, holidayIsHalfDay } = body;

    const userEmail = req.user?.email || 'system';

    const updateData: Record<string, unknown> = {
      holidayUpdatedAt: new Date(),
      holidayUpdatedBy: userEmail,
    };

    if (countryId !== undefined) {
      updateData.country = { connect: { countryId } };
    }
    if (holidayName !== undefined) {
      updateData.holidayName = holidayName;
    }
    if (holidayDate !== undefined) {
      updateData.holidayDate = new Date(holidayDate);
    }
    if (holidayIsRecurring !== undefined) {
      updateData.holidayIsRecurring = holidayIsRecurring;
    }
    if (holidayIsHalfDay !== undefined) {
      updateData.holidayIsHalfDay = holidayIsHalfDay;
    }

    const updated = await updateHoliday(id, updateData);
    if (!updated) return res.status(404).json({ error: 'Holiday not found' });

    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update holiday' });
  }
});

// DELETE /holidays/:id (soft delete)
router.delete('/:id', requirePermission('Holidays', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteHoliday(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

export default router;
