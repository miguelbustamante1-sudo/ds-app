import express from 'express';
import type { Response } from 'express';
import {
  getBonusSubcategories,
  getBonusSubcategoryById,
  createBonusSubcategory,
  updateBonusSubcategory,
  deleteBonusSubcategory,
} from '../db/bonusSubcategories';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const ALLOWED_FIELD_TYPES = ['text', 'number', 'date', 'boolean'];

function validateMetadata(metadata: unknown): { valid: boolean; error?: string } {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return { valid: false, error: 'Metadata must be a JSON object' };
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof key !== 'string' || key.trim() === '') {
      return { valid: false, error: 'Field names must be non-empty strings' };
    }
    if (!ALLOWED_FIELD_TYPES.includes(value as string)) {
      return { valid: false, error: `Invalid field type "${value}" for field "${key}". Allowed: ${ALLOWED_FIELD_TYPES.join(', ')}` };
    }
  }
  return { valid: true };
}

// GET /bonus-subcategories
router.get('/', requirePermission('Endorsements', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const countryId = req.query.countryId ? Number(req.query.countryId) : undefined;
    if (req.query.countryId && Number.isNaN(countryId)) {
      return res.status(400).json({ error: 'Invalid countryId' });
    }

    const subcategories = await getBonusSubcategories(countryId);
    res.json(subcategories);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch bonus subcategories' });
  }
});

// GET /bonus-subcategories/:id
router.get('/:id', requirePermission('Endorsements', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const subcategory = await getBonusSubcategoryById(id);
    if (!subcategory) return res.status(404).json({ error: 'Bonus subcategory not found' });

    res.json(subcategory);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch bonus subcategory' });
  }
});

// POST /bonus-subcategories
router.post('/', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bonusCategoryId, countryId, bonusSubcategoryName, bonusSubcategoryMetadata, bonusSubcategoryDefaultAmount } = req.body;

    if (!bonusCategoryId || typeof bonusCategoryId !== 'number') {
      return res.status(400).json({ error: 'bonusCategoryId is required and must be a number' });
    }
    if (!countryId || typeof countryId !== 'number') {
      return res.status(400).json({ error: 'countryId is required and must be a number' });
    }
    if (!bonusSubcategoryName || typeof bonusSubcategoryName !== 'string' || bonusSubcategoryName.trim().length < 2) {
      return res.status(400).json({ error: 'bonusSubcategoryName is required and must be at least 2 characters' });
    }

    if (bonusSubcategoryMetadata !== undefined) {
      const metaValidation = validateMetadata(bonusSubcategoryMetadata);
      if (!metaValidation.valid) {
        return res.status(400).json({ error: metaValidation.error });
      }
    }

    const created = await createBonusSubcategory({
      bonusCategoryId,
      countryId,
      bonusSubcategoryName: bonusSubcategoryName.trim(),
      bonusSubcategoryMetadata: bonusSubcategoryMetadata ?? {},
      bonusSubcategoryDefaultAmount: bonusSubcategoryDefaultAmount ?? null,
    });
    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create bonus subcategory' });
  }
});

// PUT /bonus-subcategories/:id
router.put('/:id', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { bonusCategoryId, countryId, bonusSubcategoryName, bonusSubcategoryMetadata, bonusSubcategoryDefaultAmount } = req.body;

    if (bonusSubcategoryMetadata !== undefined) {
      const metaValidation = validateMetadata(bonusSubcategoryMetadata);
      if (!metaValidation.valid) {
        return res.status(400).json({ error: metaValidation.error });
      }
    }

    if (bonusSubcategoryName !== undefined && (typeof bonusSubcategoryName !== 'string' || bonusSubcategoryName.trim().length < 2)) {
      return res.status(400).json({ error: 'bonusSubcategoryName must be at least 2 characters' });
    }

    const data: Record<string, unknown> = {};
    if (bonusCategoryId !== undefined) data.bonusCategoryId = bonusCategoryId;
    if (countryId !== undefined) data.countryId = countryId;
    if (bonusSubcategoryName !== undefined) data.bonusSubcategoryName = bonusSubcategoryName.trim();
    if (bonusSubcategoryMetadata !== undefined) data.bonusSubcategoryMetadata = bonusSubcategoryMetadata;
    if (bonusSubcategoryDefaultAmount !== undefined) data.bonusSubcategoryDefaultAmount = bonusSubcategoryDefaultAmount;

    const updated = await updateBonusSubcategory(id, data);
    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update bonus subcategory' });
  }
});

// DELETE /bonus-subcategories/:id
router.delete('/:id', requirePermission('Endorsements', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await deleteBonusSubcategory(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete bonus subcategory' });
  }
});

export default router;
