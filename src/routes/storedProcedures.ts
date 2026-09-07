import { Router, type Response } from 'express';
import { requireRole, requireAnyRole, requirePermission } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { StoredProcedureOrchestrator } from '../services/storedProcedures/StoredProcedureOrchestrator';
import { AppError } from '../errors/AppError';
import type {
  CreateStoredProcedureDTO,
  UpdateStoredProcedureDTO,
} from '@shared/dto/StoredProcedure';

export function storedProcedureRoutes(orchestrator: StoredProcedureOrchestrator): Router {
  const router = Router();

  // ─── RUN WIZARD (admin + bsa) ──────────────────────────────────────────

  router.get(
    '/',
    requirePermission('StoredProcedureRun', 'read'),
    requireAnyRole(['admin', 'bsa']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const procedures = await orchestrator.listActive();
        res.json({ data: procedures });
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

  router.get(
    '/:id/signature',
    requirePermission('StoredProcedureRun', 'read'),
    requireAnyRole(['admin', 'bsa']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const spId = Number(req.params.id);
        const signature = await orchestrator.getSignature(spId);
        res.json({ data: signature });
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
    '/:id/execute',
    requirePermission('StoredProcedureRun', 'create'),
    requireAnyRole(['admin', 'bsa']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user?.dsUserId || !req.user?.email) {
          throw new AppError('Unauthenticated', 401);
        }
        const spId = Number(req.params.id);
        const result = await orchestrator.execute(spId, req.body, req.user.dsUserId, req.user.email);
        res.json({ data: result });
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

  // ─── ADMIN MANAGEMENT (admin only) ────────────────────────────────────

  router.get(
    '/admin',
    requirePermission('StoredProcedureRun', 'read'),
    requireRole('admin'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const procedures = await orchestrator.listAll();
        res.json({ data: procedures });
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
    '/admin',
    requirePermission('StoredProcedureRun', 'create'),
    requireRole('admin'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user?.dsUserId || !req.user?.email) {
          throw new AppError('Unauthenticated', 401);
        }
        const data: CreateStoredProcedureDTO = req.body;
        const result = await orchestrator.register(data, req.user.dsUserId, req.user.email);
        res.status(201).json({ data: result });
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
    '/admin/:id',
    requirePermission('StoredProcedureRun', 'create'),
    requireRole('admin'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user?.dsUserId || !req.user?.email) {
          throw new AppError('Unauthenticated', 401);
        }
        const spId = Number(req.params.id);
        const data: UpdateStoredProcedureDTO = req.body;
        const result = await orchestrator.update(spId, data, req.user.dsUserId, req.user.email);
        res.json({ data: result });
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

  router.delete(
    '/admin/:id',
    requirePermission('StoredProcedureRun', 'delete'),
    requireRole('admin'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user?.dsUserId || !req.user?.email) {
          throw new AppError('Unauthenticated', 401);
        }
        const spId = Number(req.params.id);
        await orchestrator.softDelete(spId, req.user.dsUserId, req.user.email);
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

  return router;
}
