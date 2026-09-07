import { Router, Response } from 'express';
import { requirePermission } from '../../../middleware/auth';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { prisma } from '../../../db/prisma';
import { decryptSecret } from '../lib/secretCipher';
import { mondayIntegrationOrchestrator } from '../MondayIntegrationOrchestrator';
import { dsUserId, actorEmail, catchHandler } from '../../../routes/routeUtils';
import { MondayValidationError } from '../errors';
import type {
  CreateMondayConnectionDTO,
  UpdateMondayConnectionDTO,
  TestMondayConnectionDTO,
  SyncMondayConnectionDTO,
} from '@shared/dto';

const router = Router();

function parseMcdId(req: AuthenticatedRequest): number {
  const mcdId = parseInt(req.params['mcdId'] ?? '', 10);
  if (isNaN(mcdId)) throw new MondayValidationError('Invalid connection id');
  return mcdId;
}

// GET /api/monday-connections
router.get('/', requirePermission('StandaloneTaskAdmin', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const connections = await mondayIntegrationOrchestrator.getConnections();
    res.json({ data: connections });
  } catch (err) {
    catchHandler(err, res);
  }
});

// POST /api/monday-connections
router.post('/', requirePermission('StandaloneTaskAdmin', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as CreateMondayConnectionDTO;
    const created = await mondayIntegrationOrchestrator.createConnection(body, dsUserId(req), actorEmail(req));
    res.status(201).json({ data: created });
  } catch (err) {
    catchHandler(err, res);
  }
});

// PUT /api/monday-connections/:mcdId
router.put('/:mcdId', requirePermission('StandaloneTaskAdmin', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mcdId = parseMcdId(req);
    const body = req.body as UpdateMondayConnectionDTO;
    const updated = await mondayIntegrationOrchestrator.updateConnection(mcdId, body, dsUserId(req), actorEmail(req));
    res.json({ data: updated });
  } catch (err) {
    catchHandler(err, res);
  }
});

// DELETE /api/monday-connections/:mcdId
router.delete('/:mcdId', requirePermission('StandaloneTaskAdmin', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mcdId = parseMcdId(req);
    await mondayIntegrationOrchestrator.deleteConnection(mcdId, actorEmail(req));
    res.status(204).send();
  } catch (err) {
    catchHandler(err, res);
  }
});

// POST /api/monday-connections/test-connection
router.post('/test-connection', requirePermission('StandaloneTaskAdmin', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as TestMondayConnectionDTO;
    if (!body.mcdApiKey?.trim()) throw new MondayValidationError('API key is required');
    const result = await mondayIntegrationOrchestrator.testMondayConnection(body.mcdApiKey);
    res.json({ data: result });
  } catch (err) {
    catchHandler(err, res);
  }
});

// GET /api/monday-connections/:mcdId/columns
router.get('/:mcdId/columns', requirePermission('StandaloneTaskAdmin', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mcdId = parseMcdId(req);
    const connection = await mondayIntegrationOrchestrator.getConnectionById(mcdId);
    // The DTO only ever carries the masked key — re-fetch the decrypted one for this live call.
    const row = await prisma.mondayConnection.findUnique({ where: { mcdId } });
    if (!row) throw new MondayValidationError('Connection not found');
    const columns = await mondayIntegrationOrchestrator.listMondayBoardColumns(
      decryptSecret(row.mcdApiKeyEncrypted),
      connection.mcdBoardId,
    );
    res.json({ data: columns });
  } catch (err) {
    catchHandler(err, res);
  }
});

// POST /api/monday-connections/:mcdId/sync
router.post('/:mcdId/sync', requirePermission('StandaloneTaskAdmin', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mcdId = parseMcdId(req);
    const body = req.body as SyncMondayConnectionDTO;
    const dateRange =
      body.sinceDate && body.untilDate
        ? { sinceDate: body.sinceDate, untilDate: body.untilDate }
        : undefined;
    const summary = await mondayIntegrationOrchestrator.syncConnection(mcdId, dateRange);
    const connection = await mondayIntegrationOrchestrator.getConnectionById(mcdId);
    res.json({ data: { connection, summary } });
  } catch (err) {
    catchHandler(err, res);
  }
});

export default router;
