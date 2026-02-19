import express from 'express';
import type { Response } from 'express';
import type { CreateHiringDTO, UpdateHiringDTO } from '@shared/dto';
import { getApprovedEndorsementsWithoutHiring, getPendingHirings, getHiringById } from '../services/hiring/repository';
import { hiringOrchestrator } from '../services/hiring';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /hiring/endorsements — approved endorsements with no hiring record (Tab 1: Ready to Draft)
router.get('/endorsements', requirePermission('Hiring', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getApprovedEndorsementsWithoutHiring();
    res.json(data);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch endorsements' });
  }
});

// GET /hiring/pending — all hiring records with status "Pending" (Tab 2: Pending Execution)
router.get('/pending', requirePermission('Hiring', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await getPendingHirings();
    res.json(data);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch pending hirings' });
  }
});

// GET /hiring/:id — single hiring record with full endorsement detail
router.get('/:id', requirePermission('Hiring', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const hiring = await getHiringById(id);
    if (!hiring) return res.status(404).json({ error: 'Hiring not found' });

    res.json(hiring);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch hiring' });
  }
});

// POST /hiring — create a draft hiring record (status "Pending")
router.post('/', requirePermission('Hiring', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as CreateHiringDTO;
    const createdBy = req.user?.email ?? 'unknown';

    const result = await hiringOrchestrator.draft(body, createdBy);

    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.errors });
    }

    res.status(201).json(result.data);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create hiring' });
  }
});

// PATCH /hiring/:id/execute — update a hiring record and move status to "Processed"
router.patch('/:id/execute', requirePermission('Hiring', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const body = req.body as UpdateHiringDTO;
    const updatedBy = req.user?.email ?? 'unknown';
    const dsUserId  = req.user?.dsUserId;

    const result = await hiringOrchestrator.execute(id, body, updatedBy, dsUserId);

    if (!result.success) {
      const statusCode = result.errors?.some(e => e.field === 'id') ? 404 : 400;
      return res.status(statusCode).json({ error: 'Validation failed', details: result.errors });
    }

    res.json(result.data);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to execute hiring' });
  }
});

export default router;
