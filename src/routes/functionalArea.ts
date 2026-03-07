import express from 'express';
import type { Response } from 'express';
import type { CreateFunctionalAreaDTO, UpdateFunctionalAreaDTO } from '@shared/dto';
import {
  getAllFunctionalAreas,
  getFunctionalAreaById,
  createFunctionalArea,
  updateFunctionalArea,
  deleteFunctionalArea,
} from '../db/functionalArea';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';

const router = express.Router();

// GET /functional-areas
router.get('/', requirePermission('FunctionalAreas', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const records = await getAllFunctionalAreas();
    res.json(records);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch functional areas' });
  }
});

// GET /functional-areas/:id
router.get('/:id', requirePermission('FunctionalAreas', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const record = await getFunctionalAreaById(id);
    if (!record) return res.status(404).json({ error: 'Functional area not found' });

    res.json(record);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch functional area' });
  }
});

// POST /functional-areas
router.post('/', requirePermission('FunctionalAreas', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdBy = req.user?.email ?? 'unknown';
    const body = req.body as CreateFunctionalAreaDTO;

    if (!body.Name || typeof body.Name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const created = await createFunctionalArea(body);

    await auditOrchestrator.log({
      entityName: 'far_functional_areas',
      entityId: String(created.Id),
      createdBy,
      oldValues: null,
      newValues: created,
      comment: `Functional area "${created.Name}" created`,
    });

    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create functional area' });
  }
});

// PUT /functional-areas/:id
router.put('/:id', requirePermission('FunctionalAreas', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const updatedBy = req.user?.email ?? 'unknown';
    const body = req.body as UpdateFunctionalAreaDTO;

    const before = await getFunctionalAreaById(id);
    if (!before) return res.status(404).json({ error: 'Functional area not found' });

    const after = await updateFunctionalArea(id, body);

    await auditOrchestrator.log({
      entityName: 'far_functional_areas',
      entityId: String(id),
      createdBy: updatedBy,
      oldValues: before,
      newValues: after,
      comment: `Functional area "${after.Name}" updated`,
    });

    res.json(after);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update functional area' });
  }
});

// DELETE /functional-areas/:id
router.delete('/:id', requirePermission('FunctionalAreas', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const deletedBy = req.user?.email ?? 'unknown';

    const before = await getFunctionalAreaById(id);
    if (!before) return res.status(404).json({ error: 'Functional area not found' });

    await deleteFunctionalArea(id);

    await auditOrchestrator.log({
      entityName: 'far_functional_areas',
      entityId: String(id),
      createdBy: deletedBy,
      oldValues: before,
      newValues: null,
      comment: `Functional area "${before.Name}" deleted`,
    });

    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete functional area' });
  }
});

export default router;
