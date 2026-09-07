import express from 'express';
import type { Request, Response } from 'express';
import type { Country } from '@prisma/client';
import { getAllCountries, getCountriesByRegion, getCountryById, createCountry, updateCountry, deleteCountry } from '../db/countries';
import { getTeamMembersByCountry } from '../db/teamMembers';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';
import type { CountryDTO } from '../../shared/dto/Country';

const router = express.Router();

function toDTO(c: Country): CountryDTO {
  return {
    countryId: c.countryId,
    countryName: c.countryName,
    regionId: c.regionId ?? null,
    countryIso: c.countryIso ?? null,
    currencySymbol: c.countryCurrencySymbol ?? null,
    nightStart: c.nightStart ?? null,
    nightEnd: c.nightEnd ?? null,
    nightMultiplier: c.nightMultiplier !== null && c.nightMultiplier !== undefined ? Number(c.nightMultiplier) : null,
  };
}

// GET /countries (supports optional ?reg_id=)
router.get('/', requirePermission('Countries', 'read'), async (req: Request, res: Response) => {
  try {
    const regIdQuery = req.query.reg_id;
    if (regIdQuery !== undefined) {
      const regId = Number(regIdQuery);
      if (Number.isNaN(regId)) return res.status(400).json({ error: 'Invalid reg_id' });
      const countries = await getCountriesByRegion(regId);
      return res.json(countries.map(toDTO));
    }

    const countries: Country[] = await getAllCountries();
    res.json(countries.map(toDTO));
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

    res.json(toDTO(country));
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch country' });
  }
});

function validateNightFields(
  nightStart: unknown,
  nightEnd: unknown,
  nightMultiplier: unknown,
): string | null {
  if (nightStart === undefined || nightStart === null) return 'nightStart is required';
  if (typeof nightStart !== 'number' || !Number.isInteger(nightStart) || nightStart <= 0) {
    return 'nightStart must be a positive integer';
  }
  if (nightEnd === undefined || nightEnd === null) return 'nightEnd is required';
  if (typeof nightEnd !== 'number' || !Number.isInteger(nightEnd) || nightEnd <= 0) {
    return 'nightEnd must be a positive integer';
  }
  if (nightMultiplier === undefined || nightMultiplier === null) return 'nightMultiplier is required';
  if (typeof nightMultiplier !== 'number' || nightMultiplier < 1) {
    return 'nightMultiplier must be 1 or greater';
  }
  return null;
}

// POST /countries
router.post('/', requirePermission('Countries', 'create'), async (req: Request, res: Response) => {
  try {
    const { countryName, regionId, countryIso, currencySymbol, nightStart, nightEnd, nightMultiplier } = req.body as {
      countryName?: string;
      regionId?: number | null;
      countryIso?: string | null;
      currencySymbol?: string | null;
      nightStart?: number | null;
      nightEnd?: number | null;
      nightMultiplier?: number | null;
    };
    if (!countryName || typeof countryName !== 'string') return res.status(400).json({ error: 'countryName is required' });
    const nightError = validateNightFields(nightStart, nightEnd, nightMultiplier);
    if (nightError) return res.status(400).json({ error: nightError });
    const regId = typeof regionId === 'number' ? regionId : null;

    const created = await createCountry(regId, countryName, countryIso, currencySymbol, nightStart, nightEnd, nightMultiplier);
    res.status(201).json(toDTO(created));
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

    const { countryName, regionId, countryIso, currencySymbol, nightStart, nightEnd, nightMultiplier } = req.body as {
      countryName?: string;
      regionId?: number | null;
      countryIso?: string | null;
      currencySymbol?: string | null;
      nightStart?: number | null;
      nightEnd?: number | null;
      nightMultiplier?: number | null;
    };
    if (!countryName || typeof countryName !== 'string') return res.status(400).json({ error: 'countryName is required' });
    const nightError = validateNightFields(nightStart, nightEnd, nightMultiplier);
    if (nightError) return res.status(400).json({ error: nightError });
    const regId = typeof regionId === 'number' ? regionId : null;

    const updated = await updateCountry(id, regId, countryName, countryIso, currencySymbol, nightStart, nightEnd, nightMultiplier);
    if (!updated) return res.status(404).json({ error: 'Country not found' });

    res.json(toDTO(updated));
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
