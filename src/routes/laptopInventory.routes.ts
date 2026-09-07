// src/routes/laptopInventory.routes.ts
import { Router } from 'express';
import type { Response } from 'express';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { laptopInventoryOrchestrator } from '../services/laptopInventory/LaptopInventoryOrchestrator';

const router = Router();

router.get(
  '/',
  requirePermission('LaptopInventory', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const items = await laptopInventoryOrchestrator.list();
      res.json({ data: items });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

router.post(
  '/',
  requirePermission('LaptopInventory', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user?.dsUserId;
      if (createdBy == null) throw new AppError('Unauthenticated', 401);
      const created = await laptopInventoryOrchestrator.create(
        req.body,
        createdBy,
        req.user?.email ?? 'unknown',
      );
      res.status(201).json({ data: created });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  },
);

router.put(
  '/:id',
  requirePermission('LaptopInventory', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: 'Invalid laptop id' });
        return;
      }
      const updatedBy = req.user?.dsUserId;
      if (updatedBy == null) throw new AppError('Unauthenticated', 401);
      const updated = await laptopInventoryOrchestrator.update(
        id,
        req.body,
        updatedBy,
        req.user?.email ?? 'unknown',
      );
      res.json({ data: updated });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

router.delete(
  '/:id',
  requirePermission('LaptopInventory', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(String(req.params['id']), 10);
      if (isNaN(id) || id < 1) {
        res.status(400).json({ error: 'Invalid laptop id' });
        return;
      }
      const updatedBy = req.user?.dsUserId;
      if (updatedBy == null) throw new AppError('Unauthenticated', 401);
      await laptopInventoryOrchestrator.delete(
        id,
        updatedBy,
        req.user?.email ?? 'unknown',
      );
      res.status(204).send();
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

export default router;
