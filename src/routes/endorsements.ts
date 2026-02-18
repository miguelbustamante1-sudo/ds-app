import express from 'express';
import type { Response } from 'express';
import type { CreateEndorsementWithBonusesDTO, UpdateEndorsementDTO, UpdateEndorsementStatusDTO } from '@shared/dto';
import { getEndorsements, getEndorsementById, updateEndorsement, deleteEndorsement } from '../db/endorsements';
import { orchestrateCreateEndorsement, orchestrateUpdateEndorsement } from '../services/endorsement/EndorsementOrchestrator';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /endorsements
router.get('/', requirePermission('Endorsements', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const endorsements = await getEndorsements(status);
    res.json(endorsements);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch endorsements' });
  }
});

// GET /endorsements/:id
router.get('/:id', requirePermission('Endorsements', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const endorsement = await getEndorsementById(id);
    if (!endorsement) return res.status(404).json({ error: 'Endorsement not found' });

    res.json(endorsement);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch endorsement' });
  }
});

// POST /endorsements
router.post('/', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bonuses = [], ...endorsementFields } = req.body;
    const input = { ...endorsementFields, bonuses } as CreateEndorsementWithBonusesDTO;
    const createdBy = req.user?.email ?? 'unknown';

    const result = await orchestrateCreateEndorsement(input, createdBy);

    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.errors });
    }

    res.status(201).json(result.data);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create endorsement' });
  }
});

// PUT /endorsements/:id
router.put('/:id', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const input = req.body as UpdateEndorsementDTO;
    const updatedBy = req.user?.email ?? 'unknown';

    const result = await orchestrateUpdateEndorsement(id, input, updatedBy);

    if (!result.success) {
      const statusCode = result.errors?.some(e => e.field === 'endorsementId') ? 404 : 400;
      return res.status(statusCode).json({ error: 'Validation failed', details: result.errors });
    }

    res.json(result.data);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update endorsement' });
  }
});

// PATCH /endorsements/:id/status
router.patch('/:id/status', requirePermission('Endorsements', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { status, comment } = req.body as UpdateEndorsementStatusDTO;
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'status is required' });
    }

    const updatedBy = req.user?.email ?? 'unknown';

    const existing = await getEndorsementById(id);
    if (!existing) return res.status(404).json({ error: 'Endorsement not found' });

    const updateData: Record<string, unknown> = { status, updatedBy };
    if (comment !== undefined) updateData.comment = comment;

    const updated = await updateEndorsement(id, updateData);
    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update endorsement status' });
  }
});

// DELETE /endorsements/:id
router.delete('/:id', requirePermission('Endorsements', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const existing = await getEndorsementById(id);
    if (!existing) return res.status(404).json({ error: 'Endorsement not found' });

    await deleteEndorsement(id);
    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete endorsement' });
  }
});

export default router;
