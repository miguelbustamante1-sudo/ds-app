import express from 'express';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import type { CreateFieldglassSowDTO, UpdateFieldglassSowDTO } from '@shared/dto';
import {
  getAllFieldglassSows,
  getAllDeactivatedFieldglassSows,
  getFieldglassSowById,
  createFieldglassSow,
  updateFieldglassSow,
  reactivateFieldglassSow,
  deactivateFieldglassSow,
} from '../db/fieldglassSow';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import { AppError } from '../errors/AppError';

function handleError(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A SOW with that SOW ID already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Fieldglass SOW not found' });
      return;
    }
  }
  res.status(500).json({ error: 'Internal server error' });
}

const router = express.Router();

router.get('/', requirePermission('FieldglassSows', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const records = req.query.deactivated === 'true'
      ? await getAllDeactivatedFieldglassSows()
      : await getAllFieldglassSows();
    res.json({ data: records });
  } catch (err: unknown) {
    handleError(err, res);
  }
});

router.get('/:id', requirePermission('FieldglassSows', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const record = await getFieldglassSowById(id);
    if (!record) {
      res.status(404).json({ error: 'Fieldglass SOW not found' });
      return;
    }
    res.json({ data: record });
  } catch (err: unknown) {
    handleError(err, res);
  }
});

router.post('/', requirePermission('FieldglassSows', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const body = req.body as CreateFieldglassSowDTO;
    const created = await createFieldglassSow(body, req.user.dsUserId);
    await auditOrchestrator.log({
      entityName: 'fgs_fieldglass_sows',
      entityId: String(created.fgsId),
      createdBy: req.user.email,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Fieldglass SOW "${created.sowName ?? created.sowId ?? `#${created.fgsId}`}" created`,
    });
    res.status(201).json({ data: created });
  } catch (err: unknown) {
    handleError(err, res);
  }
});

router.put('/:id', requirePermission('FieldglassSows', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const before = await getFieldglassSowById(id);
    if (!before) {
      res.status(404).json({ error: 'Fieldglass SOW not found' });
      return;
    }
    const body = req.body as UpdateFieldglassSowDTO;
    const after = await updateFieldglassSow(id, body, req.user.dsUserId);
    await auditOrchestrator.log({
      entityName: 'fgs_fieldglass_sows',
      entityId: String(id),
      createdBy: req.user.email,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Fieldglass SOW "${after.sowName ?? after.sowId ?? `#${after.fgsId}`}" updated`,
    });
    res.json({ data: after });
  } catch (err: unknown) {
    handleError(err, res);
  }
});

router.put('/:id/reactivate', requirePermission('FieldglassSows', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const before = await getFieldglassSowById(id);
    if (!before) {
      res.status(404).json({ error: 'Fieldglass SOW not found' });
      return;
    }
    if (!before.deleted) {
      res.status(400).json({ error: 'Fieldglass SOW is already active' });
      return;
    }
    const after = await reactivateFieldglassSow(id, req.user.dsUserId);
    await auditOrchestrator.log({
      entityName: 'fgs_fieldglass_sows',
      entityId: String(id),
      createdBy: req.user.email,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Fieldglass SOW "${before.sowName ?? before.sowId ?? `#${before.fgsId}`}" reactivated`,
    });
    res.json({ data: after });
  } catch (err: unknown) {
    handleError(err, res);
  }
});

router.put('/:id/deactivate', requirePermission('FieldglassSows', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const before = await getFieldglassSowById(id);
    if (!before) {
      res.status(404).json({ error: 'Fieldglass SOW not found' });
      return;
    }
    if (before.deleted) {
      res.status(400).json({ error: 'Fieldglass SOW is already deactivated' });
      return;
    }
    const after = await deactivateFieldglassSow(id, req.user.dsUserId);
    await auditOrchestrator.log({
      entityName: 'fgs_fieldglass_sows',
      entityId: String(id),
      createdBy: req.user.email,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Fieldglass SOW "${before.sowName ?? before.sowId ?? `#${before.fgsId}`}" deactivated`,
    });
    res.json({ data: after });
  } catch (err: unknown) {
    handleError(err, res);
  }
});

export default router;
