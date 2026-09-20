import express from 'express';
import type { Response } from 'express';
import * as db from '../db/timeOffCategoriesXCountry';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit';

const router = express.Router();

/** Flatten nested category/country relations into top-level fields */
function flattenItem(item: any) {
  const { category, country, ...rest } = item;
  return {
    ...rest,
    categoryName: category?.categoryName ?? '',
    countryName: country?.countryName ?? '',
    countryIso: country?.countryIso ?? '',
  };
}

router.get('/', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const items = await db.getAll();
  res.json(items.map(flattenItem));
});

router.get('/:id', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  const item = await db.getById(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(flattenItem(item));
});

router.get('/country/:cou_id', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const cou_id = Number(req.params.cou_id);
  const items = await db.getByCountry(cou_id);
  res.json(items.map(flattenItem));
});

router.post('/', requirePermission('TimeOffCategoriesByCountry', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  const {
    categoryId,
    countryId,
    categoryCountryStatus,
    categoryCountryAllowHalfDay,
    categoryCountryIsFixedDuration,
    categoryCountryFixedDays,
    categoryCountryIsCalendar,
    categoryCountryCountHolidays,
    categoryCountryDaysBefore,
    categoryCountryMaxDays,
  } = req.body;
  const item = await db.create(
    Number(categoryId),
    Number(countryId),
    categoryCountryStatus ?? null,
    categoryCountryAllowHalfDay ?? false,
    categoryCountryIsFixedDuration ?? false,
    categoryCountryFixedDays ?? null,
    categoryCountryIsCalendar ?? false,
    categoryCountryCountHolidays ?? false,
    categoryCountryDaysBefore ?? 0,
    categoryCountryMaxDays ?? 0
  );

  await auditOrchestrator.log({
    entityName: 'ttc_type_of_to_by_country',
    entityId: String(item.categoryCountryId),
    createdBy: req.user?.email ?? 'unknown',
    oldValues: null,
    newValues: item as unknown as Record<string, unknown>,
    comment: `Category-country entry created (category ${item.categoryId}, country ${item.countryId})`,
  });

  res.status(201).json(flattenItem(item));
});

router.put('/:id', requirePermission('TimeOffCategoriesByCountry', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  const {
    categoryId,
    countryId,
    categoryCountryStatus,
    categoryCountryAllowHalfDay,
    categoryCountryIsFixedDuration,
    categoryCountryFixedDays,
    categoryCountryIsCalendar,
    categoryCountryCountHolidays,
    categoryCountryDaysBefore,
    categoryCountryMaxDays,
  } = req.body;

  const before = await db.getById(id);

  const item = await db.update(
    id,
    Number(categoryId),
    Number(countryId),
    categoryCountryStatus ?? null,
    categoryCountryAllowHalfDay,
    categoryCountryIsFixedDuration,
    categoryCountryFixedDays,
    categoryCountryIsCalendar,
    categoryCountryCountHolidays,
    categoryCountryDaysBefore,
    categoryCountryMaxDays
  );
  if (!item) return res.status(404).json({ error: 'Not found' });

  await auditOrchestrator.log({
    entityName: 'ttc_type_of_to_by_country',
    entityId: String(id),
    createdBy: req.user?.email ?? 'unknown',
    oldValues: before ? (before as unknown as Record<string, unknown>) : null,
    newValues: item as unknown as Record<string, unknown>,
    comment: `Category-country entry ${id} updated`,
  });

  res.json(flattenItem(item));
});

router.delete('/:id', requirePermission('TimeOffCategoriesByCountry', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  await db.remove(id);
  res.status(204).send();
});

export default router;
