import express from 'express';
import type { Request, Response } from 'express';
import type { Position } from '@prisma/client';
import { getAllRoles, getRoleById, createRole, updateRole, deleteRole, TABLE } from '../db/roles';
import { error } from '../logger';
import { requirePermission } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /positions
router.get('/', requirePermission('Positions', 'read'), async (req: Request, res: Response) => {
  try {
    const positions: Position[] = await getAllRoles();
    res.json(positions);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// GET /positions/:id
router.get('/:id', requirePermission('Positions', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const position = await getRoleById(id);
    if (!position) return res.status(404).json({ error: 'Position not found' });

    res.json(position);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch position' });
  }
});

// POST /positions
router.post('/', requirePermission('Positions', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pos_name, pos_description } = req.body as { pos_name?: string; pos_description?: string | null };
    if (!pos_name || typeof pos_name !== 'string') return res.status(400).json({ error: 'pos_name is required' });
    const description = typeof pos_description === 'string' ? pos_description : null;

    const created = await createRole(pos_name, description);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.posId),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
    });

    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create position' });
  }
});

// PUT /positions/:id
router.put('/:id', requirePermission('Positions', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { pos_name, pos_description } = req.body as { pos_name?: string; pos_description?: string | null };
    if (!pos_name || typeof pos_name !== 'string') return res.status(400).json({ error: 'pos_name is required' });
    const description = typeof pos_description === 'string' ? pos_description : null;

    const before = await getRoleById(id);
    if (!before) return res.status(404).json({ error: 'Position not found' });

    const updated = await updateRole(id, pos_name, description);
    if (!updated) return res.status(404).json({ error: 'Position not found' });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    });

    res.json(updated);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// DELETE /positions/:id
router.delete('/:id', requirePermission('Positions', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const before = await getRoleById(id);
    if (!before) return res.status(404).json({ error: 'Position not found' });

    await deleteRole(id);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: req.user?.email ?? 'unknown',
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
    });

    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete position' });
  }
});

export default router;
