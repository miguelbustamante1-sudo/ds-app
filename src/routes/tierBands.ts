import express from 'express';
import type { Request, Response } from 'express';
import type { TierBand } from '@prisma/client';
import { getAllTierBands, getTierBandById, createTierBand, updateTierBand, deleteTierBand } from '../db/tierBands';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /tier-bands
router.get('/', requirePermission('TierBands', 'read'), async (req: Request, res: Response) => {
  try {
    const tierBands: TierBand[] = await getAllTierBands();
    res.json(tierBands);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tier bands' });
  }
});

// GET /tier-bands/:id
router.get('/:id', requirePermission('TierBands', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const tierBand = await getTierBandById(id);
    if (!tierBand) return res.status(404).json({ error: 'Tier band not found' });

    res.json(tierBand);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tier band' });
  }
});

// POST /tier-bands
router.post('/', requirePermission('TierBands', 'create'), async (req: Request, res: Response) => {
  try {
    const { tierBandDescription } = req.body as { tierBandDescription?: string };
    if (!tierBandDescription || typeof tierBandDescription !== 'string') return res.status(400).json({ error: 'tierBandDescription is required' });

    const created = await createTierBand(tierBandDescription);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tier band' });
  }
});

// PUT /tier-bands/:id
router.put('/:id', requirePermission('TierBands', 'create'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { tierBandDescription } = req.body as { tierBandDescription?: string };
    if (!tierBandDescription || typeof tierBandDescription !== 'string') return res.status(400).json({ error: 'tierBandDescription is required' });

    const updated = await updateTierBand(id, tierBandDescription);
    if (!updated) return res.status(404).json({ error: 'Tier band not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tier band' });
  }
});

// DELETE /tier-bands/:id
router.delete('/:id', requirePermission('TierBands', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteTierBand(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tier band' });
  }
});

export default router;
