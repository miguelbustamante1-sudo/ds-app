import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { performanceCaseOrchestrator } from '../PerformanceCaseOrchestrator';
import { dsUserId, actorEmail, tmId, catchHandler } from '../../../routes/routeUtils';
import { AppError } from '../../../errors/AppError';
import type {
  AdvancePhaseDTO,
  CreateCheckInDTO,
  CreatePerformanceCaseDTO,
  PerformanceSeverityTier,
  UpdatePlanEndDateDTO,
} from '@shared/dto';
import type { SignoffGate } from '../components/RecordSignoff';
import type { ClosureCriteriaInput } from '../components/RecordClosureCriteria';

const router = Router();

router.post(
  '/',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await performanceCaseOrchestrator.createCase(
        req.body as CreatePerformanceCaseDTO,
        dsUserId(req),
        actorEmail(req),
      );
      res.status(201).json({ data: created });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/',
  requirePermission('PerformanceCases', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.getAllCases();
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/manager-view',
  requirePermission('PerformanceCases', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.getManagerView(tmId(req));
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/portfolio-summary',
  requirePermission('PerformanceCases', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.getPortfolioSummary(tmId(req));
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/hr-partner-view',
  requirePermission('PerformanceCases', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.getCasesForHrPartner(tmId(req));
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/:id',
  requirePermission('PerformanceCases', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.getCase(Number(req.params['id']));
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/:id/phases',
  requirePermission('PerformanceCases', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.getCasePhases(Number(req.params['id']));
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.delete(
  '/:id',
  requirePermission('PerformanceCases', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await performanceCaseOrchestrator.deleteCase(
        Number(req.params['id']),
        dsUserId(req),
        actorEmail(req),
        tmId(req),
      );
      res.status(204).send();
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/advance-phase',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.advancePhase(
        Number(req.params['id']),
        req.body as AdvancePhaseDTO,
        dsUserId(req),
        actorEmail(req),
      );
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/upgrade-severity',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { to, reason } = req.body as { to: PerformanceSeverityTier; reason: string };
      if (!to || !reason) throw new AppError('to and reason are required', 400);
      const result = await performanceCaseOrchestrator.upgradeSeverity(
        Number(req.params['id']),
        to,
        reason,
        dsUserId(req),
        actorEmail(req),
      );
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/signoff',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { gate } = req.body as { gate: SignoffGate };
      if (!gate) throw new AppError('gate is required', 400);
      const result = await performanceCaseOrchestrator.recordSignoff(
        Number(req.params['id']),
        gate,
        dsUserId(req),
        actorEmail(req),
      );
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/calibration',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.recordCalibration(
        Number(req.params['id']),
        dsUserId(req),
        actorEmail(req),
      );
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/closure-criteria',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.recordClosureCriteria(
        Number(req.params['id']),
        req.body as ClosureCriteriaInput,
        dsUserId(req),
        actorEmail(req),
      );
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/phase-fields',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.savePhaseFields(
        Number(req.params['id']),
        req.body as Record<string, unknown>,
        dsUserId(req),
        actorEmail(req),
      );
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/plan-end-date',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { newEndDate, changeComment, hintForSuccessTriggered } = req.body as UpdatePlanEndDateDTO;
      if (!newEndDate || !changeComment) throw new AppError('newEndDate and changeComment are required', 400);
      const result = await performanceCaseOrchestrator.updatePlanEndDate(
        Number(req.params['id']),
        newEndDate,
        changeComment,
        hintForSuccessTriggered,
        dsUserId(req),
        actorEmail(req),
      );
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/documents',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { uploadId, documentLabel } = req.body as { uploadId: number; documentLabel?: string };
      if (!uploadId) throw new AppError('uploadId is required', 400);
      const result = await performanceCaseOrchestrator.attachDocument(
        Number(req.params['id']),
        uploadId,
        documentLabel,
        dsUserId(req),
        actorEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.get(
  '/:id/documents',
  requirePermission('PerformanceCases', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.listDocuments(Number(req.params['id']));
      res.json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.delete(
  '/:id/documents/:documentId',
  requirePermission('PerformanceCases', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await performanceCaseOrchestrator.deleteDocument(
        Number(req.params['id']),
        Number(req.params['documentId']),
        actorEmail(req),
      );
      res.status(204).send();
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

router.post(
  '/:id/checkins',
  requirePermission('PerformanceCases', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await performanceCaseOrchestrator.createCheckIn(
        Number(req.params['id']),
        req.body as CreateCheckInDTO,
        dsUserId(req),
        actorEmail(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      catchHandler(err, res);
    }
  },
);

export default router;
