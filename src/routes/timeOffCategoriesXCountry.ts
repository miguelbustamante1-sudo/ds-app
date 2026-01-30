import express from 'express';
import type { Request, Response } from 'express';
import * as db from '../db/timeOffCategoriesXCountry';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

router.get('/', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: Request, res: Response) => {
  const items = await db.getAll();
  res.json(items);
});

router.get('/:id', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await db.getById(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.get('/country/:cou_id', requirePermission('TimeOffCategoriesByCountry', 'read'), async (req: Request, res: Response) => {
  const cou_id = Number(req.params.cou_id);
  const items = await db.getByCountry(cou_id);
  res.json(items);
});

router.post('/', requirePermission('TimeOffCategoriesByCountry', 'create'), async (req: Request, res: Response) => {
  const { cat_id, cou_id, cxc_status, cxc_allow_half_day, cxc_is_fixed_duration, cxc_fixed_days } = req.body;
  const item = await db.create(
    Number(cat_id),
    Number(cou_id),
    cxc_status ?? null,
    cxc_allow_half_day ?? false,
    cxc_is_fixed_duration ?? false,
    cxc_fixed_days ?? null
  );
  res.status(201).json(item);
});

router.put('/:id', requirePermission('TimeOffCategoriesByCountry', 'create'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { cat_id, cou_id, cxc_status, cxc_allow_half_day, cxc_is_fixed_duration, cxc_fixed_days } = req.body;
  const item = await db.update(
    id,
    Number(cat_id),
    Number(cou_id),
    cxc_status ?? null,
    cxc_allow_half_day,
    cxc_is_fixed_duration,
    cxc_fixed_days
  );
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.delete('/:id', requirePermission('TimeOffCategoriesByCountry', 'delete'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await db.remove(id);
  res.status(204).send();
});

export default router;
