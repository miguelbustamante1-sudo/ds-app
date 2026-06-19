import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { recurringTaskTemplateOrchestrator } from '../RecurringTaskTemplateOrchestrator';
import { extractMeetingDate } from '../components/ExtractMeetingDate';
import type { CreateRecurringTaskTemplateDTO, UpdateRecurringTaskTemplateDTO } from '@shared/dto';
import { dsUserId, tmId, actorEmail, catchHandler } from '../../../routes/routeUtils';

const router = Router();

router.post(
  '/',
  requirePermission('StandaloneTaskAdmin', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as CreateRecurringTaskTemplateDTO;
      const template = await recurringTaskTemplateOrchestrator.createTemplate(
        body,
        dsUserId(req),
        actorEmail(req),
        tmId(req),
      );
      res.status(201).json({ data: template });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/',
  requirePermission('StandaloneTaskAdmin', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const includeInactive = req.query['includeInactive'] === 'true';
      const templates = await recurringTaskTemplateOrchestrator.getTemplateList({ includeInactive });
      res.json({ data: templates });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/:rttId',
  requirePermission('StandaloneTaskAdmin', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rttId = parseInt(req.params['rttId'] ?? '', 10);
      if (isNaN(rttId)) { res.status(400).json({ error: 'Invalid template ID' }); return; }
      const template = await recurringTaskTemplateOrchestrator.getTemplateById(rttId);
      res.json({ data: template });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.patch(
  '/:rttId',
  requirePermission('StandaloneTaskAdmin', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rttId = parseInt(req.params['rttId'] ?? '', 10);
      if (isNaN(rttId)) { res.status(400).json({ error: 'Invalid template ID' }); return; }
      const body = req.body as UpdateRecurringTaskTemplateDTO;
      const template = await recurringTaskTemplateOrchestrator.updateTemplate(
        rttId,
        body,
        dsUserId(req),
        actorEmail(req),
      );
      res.json({ data: template });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

// POST /api/recurring-task-templates/extract-date
router.post(
  '/extract-date',
  requirePermission('StandaloneTask', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { uploadId } = req.body as { uploadId: number };
      if (!uploadId || isNaN(Number(uploadId))) {
        res.status(400).json({ error: 'uploadId is required' });
        return;
      }
      const date = await extractMeetingDate(Number(uploadId));
      res.json({ data: { date } });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
