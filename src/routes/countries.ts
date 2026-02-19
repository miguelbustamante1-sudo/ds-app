import express from 'express';
import type { Request, Response } from 'express';
import type { Country } from '@prisma/client';
import { getAllCountries, getCountriesByRegion, getCountryById, createCountry, updateCountry, deleteCountry } from '../db/countries';
import { getTeamMembersByCountry } from '../db/teamMembers';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /countries (supports optional ?reg_id=)
router.get('/', requirePermission('Countries', 'read'), async (req: Request, res: Response) => {
  try {
    const regIdQuery = req.query.reg_id;
    if (regIdQuery !== undefined) {
      const regId = Number(regIdQuery);
      if (Number.isNaN(regId)) return res.status(400).json({ error: 'Invalid reg_id' });
      const countries = await getCountriesByRegion(regId);
      return res.json(countries);
    }

    const countries: Country[] = await getAllCountries();
    res.json(countries);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// GET /countries/:id/team-members
router.get('/:id/team-members', requirePermission('Countries', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const items = await getTeamMembersByCountry(id);
    res.json(items);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch team members for country' });
  }
});

// GET /countries/:id
router.get('/:id', requirePermission('Countries', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const country = await getCountryById(id);
    if (!country) return res.status(404).json({ error: 'Country not found' });

    res.json(country);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch country' });
  }
});

// POST /countries
router.post('/', requirePermission('Countries', 'create'), async (req: Request, res: Response) => {
  try {
    const { countryName, regionId, currencySymbol } = req.body as { countryName?: string; regionId?: number | null; currencySymbol?: string | null };
    if (!countryName || typeof countryName !== 'string') return res.status(400).json({ error: 'countryName is required' });
    const regId = typeof regionId === 'number' ? regionId : null;

    const created = await createCountry(regId, countryName, currencySymbol);
    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create country' });
  }
});

// PUT /countries/:id
router.put('/:id', requirePermission('Countries', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { countryName, regionId, currencySymbol } = req.body as { countryName?: string; regionId?: number | null; currencySymbol?: string | null };
    if (!countryName || typeof countryName !== 'string') return res.status(400).json({ error: 'countryName is required' });
    const regId = typeof regionId === 'number' ? regionId : null;

    const updated = await updateCountry(id, regId, countryName, currencySymbol);
    if (!updated) return res.status(404).json({ error: 'Country not found' });

    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update country' });
  }
});

// DELETE /countries/:id
router.delete('/:id', requirePermission('Countries', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteCountry(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete country' });
  }
});

export default router;
