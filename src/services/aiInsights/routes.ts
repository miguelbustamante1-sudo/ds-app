import { Router } from 'express';
import type { Response } from 'express';
import { requirePermission } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import aiInsightsOrchestrator from './AiInsightsOrchestrator';
import { AppError } from '../../errors/AppError';
import type { ChatMessage } from './types';

const router = Router();

// GET /api/ai/insights
router.get(
  '/insights',
  requirePermission('AiInsights', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const insights = await aiInsightsOrchestrator.getInsights(
        req.user?.teamMemberId,
        req.user?.dsUserId
      );
      return res.json({ data: insights });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }
);

// POST /api/ai/chat
router.post(
  '/chat',
  requirePermission('AiChat', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, history } = req.body as {
        message: unknown;
        history: unknown;
      };

      if (!message || typeof message !== 'string') {
        throw new AppError('message is required', 400);
      }

      const safeHistory: ChatMessage[] = Array.isArray(history)
        ? (history as ChatMessage[]).filter(
            (m) => m && typeof m.role === 'string' && typeof m.content === 'string'
          )
        : [];

      const reply = await aiInsightsOrchestrator.chat(
        req.user?.teamMemberId,
        req.user?.dsUserId,
        safeHistory,
        message
      );

      return res.json({ data: { reply } });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }
);

export default router;
