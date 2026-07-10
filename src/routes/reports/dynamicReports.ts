import express from 'express';
import type { Response } from 'express';
import { requirePermission } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { dynamicReportOrchestrator } from '../../services/reports/dynamic/DynamicReportOrchestrator';
import type {
  ValidateRequestDTO,
  ExecuteRequestDTO,
  CreateReportDTO,
  UpdateReportDTO,
} from '@shared/dto/DynamicReport';

const router = express.Router();

// GET /api/reports/dynamic — list active reports
router.get(
  '/',
  requirePermission('Reports', 'read'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const reports = await dynamicReportOrchestrator.listActive();
      res.json(reports);
    } catch (err) {
      console.error('[reports/dynamic] GET / Error:', err);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  },
);

// GET /api/reports/dynamic/all — list all reports (active and inactive)
// Must be defined before /:id to avoid matching "all" as an id
router.get(
  '/all',
  requirePermission('Reports', 'create'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const reports = await dynamicReportOrchestrator.listAll();
      res.json(reports);
    } catch (err) {
      console.error('[reports/dynamic] GET /all Error:', err);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  },
);

// POST /api/reports/dynamic/validate — validate SQL
// Must be defined before /:id to avoid matching "validate" as an id
router.post(
  '/validate',
  requirePermission('Reports', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as ValidateRequestDTO;
      if (!body?.sql) {
        return res.status(400).json({ error: 'Missing required field: sql' });
      }
      const result = await dynamicReportOrchestrator.validateSql(body.sql);
      res.json(result);
    } catch (err) {
      console.error('[reports/dynamic] POST /validate Error:', err);
      res.status(500).json({ error: 'Failed to validate SQL' });
    }
  },
);

// POST /api/reports/dynamic — create report
router.post(
  '/',
  requirePermission('Reports', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user?.email ?? 'unknown';
      const body = req.body as CreateReportDTO;
      const created = await dynamicReportOrchestrator.create(body, createdBy);
      res.status(201).json(created);
    } catch (err) {
      console.error('[reports/dynamic] POST / Error:', err);
      res.status(500).json({ error: 'Failed to create report' });
    }
  },
);

// GET /api/reports/dynamic/:id — get report by id
router.get(
  '/:id',
  requirePermission('Reports', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid report id' });

      const report = await dynamicReportOrchestrator.getById(id, req.user?.permissions ?? {});
      if (!report) return res.status(404).json({ error: 'Report not found' });

      res.json(report);
    } catch (err) {
      console.error('[reports/dynamic] GET /:id Error:', err);
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  },
);

// PUT /api/reports/dynamic/:id — update report
router.put(
  '/:id',
  requirePermission('Reports', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid report id' });

      const updatedBy = req.user?.email ?? 'unknown';
      const body = req.body as UpdateReportDTO;
      const updated = await dynamicReportOrchestrator.update(id, body, updatedBy);
      res.json(updated);
    } catch (err) {
      console.error('[reports/dynamic] PUT /:id Error:', err);
      res.status(500).json({ error: 'Failed to update report' });
    }
  },
);

// DELETE /api/reports/dynamic/:id — soft-delete report
router.delete(
  '/:id',
  requirePermission('Reports', 'delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid report id' });

      const updatedBy = req.user?.email ?? 'unknown';
      const result = await dynamicReportOrchestrator.softDelete(id, updatedBy);
      res.json(result);
    } catch (err) {
      console.error('[reports/dynamic] DELETE /:id Error:', err);
      res.status(500).json({ error: 'Failed to deactivate report' });
    }
  },
);

// POST /api/reports/dynamic/:id/download — export up to 50 000 rows as JSON (SheetJS path)
router.post(
  '/:id/download',
  requirePermission('Reports', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid report id' });

      const body = req.body as ExecuteRequestDTO;
      const result = await dynamicReportOrchestrator.download(id, body, req.user?.permissions ?? {});
      res.json(result);
    } catch (err) {
      console.error('[reports/dynamic] POST /:id/download Error:', err);
      res.status(500).json({ error: 'Failed to export report' });
    }
  },
);

// POST /api/reports/dynamic/:id/download/stream — stream full result set as CSV (large exports)
router.post(
  '/:id/download/stream',
  requirePermission('Reports', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid report id' });

    const body = req.body as ExecuteRequestDTO;
    const filename = `report-${id}-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    try {
      await dynamicReportOrchestrator.streamCsv(id, body, res, req.user?.permissions ?? {});
    } catch (err) {
      console.error('[reports/dynamic] POST /:id/download/stream Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to export report' });
      } else {
        res.end();
      }
    }
  },
);

// POST /api/reports/dynamic/:id/execute — execute report
router.post(
  '/:id/execute',
  requirePermission('Reports', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid report id' });

      const body = req.body as ExecuteRequestDTO;
      const result = await dynamicReportOrchestrator.execute(id, body, req.user?.permissions ?? {});
      res.json(result);
    } catch (err) {
      console.error('[reports/dynamic] POST /:id/execute Error:', err);
      res.status(500).json({ error: 'Failed to execute report' });
    }
  },
);

// GET /api/reports/dynamic/:id/options/:paramName — get parameter options
router.get(
  '/:id/options/:paramName',
  requirePermission('Reports', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid report id' });

      const paramName = req.params.paramName as string;
      const options = await dynamicReportOrchestrator.getOptions(id, paramName, req.user?.permissions ?? {});
      res.json(options);
    } catch (err) {
      console.error('[reports/dynamic] GET /:id/options/:paramName Error:', err);
      res.status(500).json({ error: 'Failed to fetch parameter options' });
    }
  },
);

export default router;
