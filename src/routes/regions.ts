import express from 'express';
import type { Request, Response } from 'express';
import type { Region } from '@prisma/client';
import { getAllRegions, getRegionById, createRegion, updateRegion, deleteRegion } from '../db/regions';
import { getCountriesByRegion } from '../db/countries';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /regions
router.get('/', requirePermission('Regions', 'read'), async (req: Request, res: Response) => {
  try {
    const regions: Region[] = await getAllRegions();
    res.json(regions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// GET /regions/:id
router.get('/:id', requirePermission('Regions', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const region = await getRegionById(id);
    if (!region) return res.status(404).json({ error: 'Region not found' });

    res.json(region);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch region' });
  }
});

// GET /regions/:id/countries
router.get('/:id/countries', requirePermission('Regions', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const countries = await getCountriesByRegion(id);
    res.json(countries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch countries for region' });
  }
});

// POST /regions
router.post('/', requirePermission('Regions', 'create'), async (req: Request, res: Response) => {
  try {
    const { regionName } = req.body as { regionName?: string };
    if (!regionName || typeof regionName !== 'string') return res.status(400).json({ error: 'regionName is required' });

    const created = await createRegion(regionName);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create region' });
  }
});

// PUT /regions/:id
router.put('/:id', requirePermission('Regions', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { regionName } = req.body as { regionName?: string };
    if (!regionName || typeof regionName !== 'string') return res.status(400).json({ error: 'regionName is required' });

    const updated = await updateRegion(id, regionName);
    if (!updated) return res.status(404).json({ error: 'Region not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update region' });
  }
});

// DELETE /regions/:id
router.delete('/:id', requirePermission('Regions', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteRegion(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete region' });
  }
});

export default router;
