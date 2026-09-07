import { Router } from 'express';
import type { Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import { emailOrchestrator } from '../services/email';
import { AppError } from '../errors/AppError';

const router = Router();

router.get(
  '/:messageId',
  requirePermission('EmailAdmin', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      if (!messageId) {
        throw new AppError('messageId is required', 400);
      }
      const insights = await emailOrchestrator.getMessageInsights(messageId);
      res.json({ data: insights });
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
