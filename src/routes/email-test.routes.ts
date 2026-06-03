import { Router } from 'express';
import type { Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import { emailOrchestrator } from '../services/email';
import { AppError } from '../errors/AppError';

const router = Router();

interface EmailTestBody {
  to: string;
  subject: string;
  body: string;
  isHtml: boolean;
  replyTo?: string;
}

router.post(
  '/send',
  requirePermission('Users', 'create'),
  async (req: Request, res: Response) => {
    try {
      const { to, subject, body, isHtml, replyTo } = req.body as EmailTestBody;

      if (!to || !subject || !body) {
        throw new AppError('to, subject, and body are required', 400);
      }

      await emailOrchestrator.send({
        to,
        subject,
        body,
        isHtml: isHtml === true,
        ...(replyTo !== undefined ? { replyTo } : {}),
      });

      res.json({ data: { sent: true } });
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
