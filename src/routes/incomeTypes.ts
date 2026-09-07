import express from 'express';
import type { Response } from 'express';
import { incomeTypeOrchestrator } from '../services/incomeType';
import { requirePermission, requireRole } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { CreateIncomeTypeDTO, UpdateIncomeTypeDTO } from '@shared/dto/IncomeType';

const router = express.Router();

function catchBlock(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// GET /income-types
router.get('/', requirePermission('PayrollAdmin', 'read'), requireRole('bsa'), async (_req, res: Response) => {
  try {
    const items = await incomeTypeOrchestrator.getAll();
    res.json({ data: items });
  } catch (err) {
    catchBlock(err, res);
  }
});

// GET /income-types/active — read-only, no bsa/PayrollAdmin gate: hierarchy users need this
// to populate the create-form ComboBox on the non-admin Other Incomes page. Must be
// registered before GET /:id, or Express would match "active" as the :id param.
router.get('/active', requirePermission('OtherIncomes', 'read'), async (_req, res: Response) => {
  try {
    const items = await incomeTypeOrchestrator.getActive();
    res.json({ data: items });
  } catch (err) {
    catchBlock(err, res);
  }
});

// GET /income-types/:id
router.get('/:id', requirePermission('PayrollAdmin', 'read'), requireRole('bsa'), async (req, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const item = await incomeTypeOrchestrator.getById(id);
    res.json({ data: item });
  } catch (err) {
    catchBlock(err, res);
  }
});

// POST /income-types
router.post(
  '/',
  requirePermission('PayrollAdmin', 'create'),
  requireRole('bsa'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
      const body = req.body as CreateIncomeTypeDTO;
      if (!body.incomeTypeName || body.incomeTypeName.trim().length === 0) {
        res.status(400).json({ error: 'incomeTypeName is required' });
        return;
      }
      const created = await incomeTypeOrchestrator.create(body, req.user.email, req.user.dsUserId);
      res.status(201).json({ data: created });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// PUT /income-types/:id
router.put(
  '/:id',
  requirePermission('PayrollAdmin', 'create'),
  requireRole('bsa'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const updated = await incomeTypeOrchestrator.update(id, req.body as UpdateIncomeTypeDTO, req.user.email, req.user.dsUserId);
      res.json({ data: updated });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// DELETE /income-types/:id
router.delete(
  '/:id',
  requirePermission('PayrollAdmin', 'delete'),
  requireRole('bsa'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.email) throw new AppError('Unauthenticated', 401);
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      await incomeTypeOrchestrator.delete(id, req.user.email);
      res.status(204).send();
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

export default router;
