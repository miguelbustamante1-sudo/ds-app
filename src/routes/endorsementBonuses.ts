import express from 'express';
import type { Response } from 'express';
import type { CreateEndorsementBonusDTO, UpdateEndorsementBonusDTO } from '@shared/dto';
import {
  getEndorsementBonusesByEndorsementId,
  getEndorsementBonusById,
  createEndorsementBonus,
  updateEndorsementBonus,
  deleteEndorsementBonus,
} from '../db/endorsementBonuses';
import { getEndorsementById } from '../db/endorsements';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /endorsement-bonuses?endorsementId=
router.get('/', requirePermission('Endorsements', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const endorsementId = Number(req.query.endorsementId);
    if (Number.isNaN(endorsementId)) {
      return res.status(400).json({ error: 'endorsementId query parameter is required' });
    }

    const bonuses = await getEndorsementBonusesByEndorsementId(endorsementId);
    res.json(bonuses);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch endorsement bonuses' });
  }
});

// GET /endorsement-bonuses/:id
router.get('/:id', requirePermission('Endorsements', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const bonus = await getEndorsementBonusById(id);
    if (!bonus) return res.status(404).json({ error: 'Endorsement bonus not found' });

    res.json(bonus);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch endorsement bonus' });
  }
});

// POST /endorsement-bonuses
router.post('/', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const input = req.body as CreateEndorsementBonusDTO;

    if (!input.endorsementId || typeof input.endorsementId !== 'number') {
      return res.status(400).json({ error: 'endorsementId is required and must be a number' });
    }

    const endorsement = await getEndorsementById(input.endorsementId);
    if (!endorsement) {
      return res.status(404).json({ error: 'Endorsement not found' });
    }

    const createdBy = req.user?.email ?? 'unknown';

    const created = await createEndorsementBonus({
      endorsementId: input.endorsementId,
      bonusSubcategoryId: input.bonusSubcategoryId ?? null,
      endorsementBonusAmount: input.endorsementBonusAmount ?? null,
      endorsementBonusMetadata: input.endorsementBonusMetadata ?? {},
      endorsementBonusComments: input.endorsementBonusComments ?? null,
      endorsementBonusCreatedBy: createdBy,
    });

    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create endorsement bonus' });
  }
});

// PUT /endorsement-bonuses/:id
router.put('/:id', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const existing = await getEndorsementBonusById(id);
    if (!existing) return res.status(404).json({ error: 'Endorsement bonus not found' });

    const input = req.body as UpdateEndorsementBonusDTO;
    const updateData: Record<string, unknown> = {};

    if (input.bonusSubcategoryId !== undefined) updateData.bonusSubcategoryId = input.bonusSubcategoryId;
    if (input.endorsementBonusAmount !== undefined) updateData.endorsementBonusAmount = input.endorsementBonusAmount;
    if (input.endorsementBonusMetadata !== undefined) updateData.endorsementBonusMetadata = input.endorsementBonusMetadata;
    if (input.endorsementBonusComments !== undefined) updateData.endorsementBonusComments = input.endorsementBonusComments;

    const updated = await updateEndorsementBonus(id, updateData);
    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update endorsement bonus' });
  }
});

// DELETE /endorsement-bonuses/:id
router.delete('/:id', requirePermission('Endorsements', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const existing = await getEndorsementBonusById(id);
    if (!existing) return res.status(404).json({ error: 'Endorsement bonus not found' });

    await deleteEndorsementBonus(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete endorsement bonus' });
  }
});

export default router;
