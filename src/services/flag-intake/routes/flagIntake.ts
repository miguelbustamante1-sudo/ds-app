import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { validateApiKey } from '../../../middleware/apiKey';
import { flagIntakeOrchestrator } from '../FlagIntakeOrchestrator';
import { AppError } from '../../../errors/AppError';
import { dsUserId, actorEmail, catchHandler } from '../../../routes/routeUtils';
import type { SubmitFlagIntakeDTO } from '@shared/dto';

const router = Router();

function handleSubmit(defaultTaskSource: 'API' | 'INTERNAL') {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const body = req.body as SubmitFlagIntakeDTO;
      if (!Array.isArray(body.rows) || body.rows.length === 0) {
        throw new AppError('rows must be a non-empty array', 400);
      }

      const apiKeyId = req.apiKeyId;
      const result = await flagIntakeOrchestrator.submitFlagIntake(
        body.rows,
        dsUserId(req),
        actorEmail(req),
        defaultTaskSource === 'API' && apiKeyId !== undefined
          ? { taskSource: 'API', apiKeyId }
          : { taskSource: 'INTERNAL' },
      );
      res.status(200).json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  };
}

// POST /api/flag-intake/external — external systems, API-key authenticated
router.post(
  '/external',
  validateApiKey,
  requirePermission('FlagIntake', 'create'),
  handleSubmit('API'),
);

// POST /api/flag-intake/import — admin upload UI, session authenticated
router.post(
  '/import',
  requirePermission('StandaloneTaskAdmin', 'create'),
  handleSubmit('INTERNAL'),
);

export default router;
