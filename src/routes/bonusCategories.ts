import express from 'express';
import type { Response } from 'express';
import { getBonusCategories, getBonusCategoryById, createBonusCategory, updateBonusCategory, deleteBonusCategory } from '../db/bonusCategories';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /bonus-categories
router.get('/', requirePermission('Endorsements', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await getBonusCategories();
    res.json(categories);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch bonus categories' });
  }
});

// GET /bonus-categories/:id
router.get('/:id', requirePermission('Endorsements', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const category = await getBonusCategoryById(id);
    if (!category) return res.status(404).json({ error: 'Bonus category not found' });

    res.json(category);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch bonus category' });
  }
});

// POST /bonus-categories
router.post('/', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bonusCategoryName } = req.body as { bonusCategoryName?: string };
    if (!bonusCategoryName || typeof bonusCategoryName !== 'string') {
      return res.status(400).json({ error: 'bonusCategoryName is required' });
    }

    const created = await createBonusCategory(bonusCategoryName.trim());
    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create bonus category' });
  }
});

// PUT /bonus-categories/:id
router.put('/:id', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { bonusCategoryName } = req.body as { bonusCategoryName?: string };
    if (!bonusCategoryName || typeof bonusCategoryName !== 'string') {
      return res.status(400).json({ error: 'bonusCategoryName is required' });
    }

    const updated = await updateBonusCategory(id, bonusCategoryName.trim());
    if (!updated) return res.status(404).json({ error: 'Bonus category not found' });

    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update bonus category' });
  }
});

// DELETE /bonus-categories/:id
router.delete('/:id', requirePermission('Endorsements', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteBonusCategory(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete bonus category' });
  }
});

export default router;
