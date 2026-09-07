import { Router, Response } from 'express';
import { validateApiKey } from '../middleware/apiKey';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { externalBonusIntakeOrchestrator } from '../services/externalBonusIntake/ExternalBonusIntakeOrchestrator';
import { catchHandler } from './routeUtils';
import { AppError } from '../errors/AppError';
import type { SubmitBonusExternalEntriesDTO } from '@shared/dto';

const router = Router();

// POST /api/bonuses/external
router.post(
  '/',
  validateApiKey,
  requirePermission('ExternalBonusIntake', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.apiKeyId) {
        throw new AppError('Unauthenticated', 401);
      }
      const body = req.body as SubmitBonusExternalEntriesDTO;
      const result = await externalBonusIntakeOrchestrator.submitEntries(body.entries, req.apiKeyId);
      res.status(201).json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
