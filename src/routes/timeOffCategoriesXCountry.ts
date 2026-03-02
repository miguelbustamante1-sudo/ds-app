import express from 'express';
import type { Request, Response } from 'express';
import * as db from '../db/timeOffCategoriesXCountry';
import { requirePermission } from '../middleware/auth';

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

router.get('/', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: Request, res: Response) => {
  const items = await db.getAll();
  res.json(items.map(flattenItem));
});

router.get('/:id', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await db.getById(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(flattenItem(item));
});

router.get('/country/:cou_id', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: Request, res: Response) => {
  const cou_id = Number(req.params.cou_id);
  const items = await db.getByCountry(cou_id);
  res.json(items.map(flattenItem));
});

router.post('/', requirePermission('TimeOffCategoriesByCountry', 'create'), async (req: Request, res: Response) => {
  const {
    categoryId,
    countryId,
    categoryCountryStatus,
    categoryCountryAllowHalfDay,
    categoryCountryIsFixedDuration,
    categoryCountryFixedDays,
    categoryCountryIsCalendar,
    categoryCountryDaysBefore,
  } = req.body;
  const item = await db.create(
    Number(categoryId),
    Number(countryId),
    categoryCountryStatus ?? null,
    categoryCountryAllowHalfDay ?? false,
    categoryCountryIsFixedDuration ?? false,
    categoryCountryFixedDays ?? null,
    categoryCountryIsCalendar ?? false,
    categoryCountryDaysBefore ?? 0
  );
  res.status(201).json(flattenItem(item));
});

router.put('/:id', requirePermission('TimeOffCategoriesByCountry', 'create'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const {
    categoryId,
    countryId,
    categoryCountryStatus,
    categoryCountryAllowHalfDay,
    categoryCountryIsFixedDuration,
    categoryCountryFixedDays,
    categoryCountryIsCalendar,
    categoryCountryDaysBefore,
  } = req.body;
  const item = await db.update(
    id,
    Number(categoryId),
    Number(countryId),
    categoryCountryStatus ?? null,
    categoryCountryAllowHalfDay,
    categoryCountryIsFixedDuration,
    categoryCountryFixedDays,
    categoryCountryIsCalendar,
    categoryCountryDaysBefore
  );
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(flattenItem(item));
});

router.delete('/:id', requirePermission('TimeOffCategoriesByCountry', 'delete'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await db.remove(id);
  res.status(204).send();
});

export default router;
