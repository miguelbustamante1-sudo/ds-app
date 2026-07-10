import express from 'express';
import type { Response } from 'express';
import type { CreateWorkdayInfoDTO, UpdateWorkdayInfoDTO } from '@shared/dto';
import {
  getAllWorkdayInfo,
  getWorkdayInfoById,
  createWorkdayInfo,
  updateWorkdayInfo,
  deleteWorkdayInfo,
} from '../db/workdayInfo';
import { error } from '../logger';
import { requirePermission, type AuthenticatedRequest } from '../middleware/auth';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';

const router = express.Router();

// GET /workday-info
router.get('/', requirePermission('WorkdayInfo', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const records = await getAllWorkdayInfo();
    res.json(records);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch workday info records' });
  }
});

// GET /workday-info/:wdid
router.get('/:wdid', requirePermission('WorkdayInfo', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdid = req.params.wdid as string;
    const record = await getWorkdayInfoById(wdid);
    if (!record) return res.status(404).json({ error: 'Workday info record not found' });
    res.json(record);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to fetch workday info record' });
  }
});

// POST /workday-info
router.post('/', requirePermission('WorkdayInfo', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdBy = req.user?.email ?? 'unknown';
    const body = req.body as CreateWorkdayInfoDTO;

    if (!body.wdid || typeof body.wdid !== 'string') {
      return res.status(400).json({ error: 'wdid is required' });
    }

    const existing = await getWorkdayInfoById(body.wdid);
    if (existing) {
      return res.status(409).json({ error: `A record with wdid "${body.wdid}" already exists` });
    }

    const created = await createWorkdayInfo(body);

    await auditOrchestrator.log({
      entityName: 'win_worday_info',
      entityId: created.wdid,
      createdBy,
      oldValues: null,
      newValues: created,
      comment: `Workday info record created for wdid "${created.wdid}"`,
    });

    res.status(201).json(created);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to create workday info record' });
  }
});

// PUT /workday-info/:wdid
router.put('/:wdid', requirePermission('WorkdayInfo', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdid = req.params.wdid as string;
    const updatedBy = req.user?.email ?? 'unknown';
    const body = req.body as UpdateWorkdayInfoDTO;

    const before = await getWorkdayInfoById(wdid);
    if (!before) return res.status(404).json({ error: 'Workday info record not found' });

    const after = await updateWorkdayInfo(wdid, body);

    await auditOrchestrator.log({
      entityName: 'win_worday_info',
      entityId: wdid,
      createdBy: updatedBy,
      oldValues: before,
      newValues: after,
      comment: `Workday info record updated for wdid "${wdid}"`,
    });

    res.json(after);
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to update workday info record' });
  }
});

// DELETE /workday-info/:wdid
router.delete('/:wdid', requirePermission('WorkdayInfo', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wdid = req.params.wdid as string;
    const deletedBy = req.user?.email ?? 'unknown';

    const before = await getWorkdayInfoById(wdid);
    if (!before) return res.status(404).json({ error: 'Workday info record not found' });

    await deleteWorkdayInfo(wdid);

    await auditOrchestrator.log({
      entityName: 'win_worday_info',
      entityId: wdid,
      createdBy: deletedBy,
      oldValues: before,
      newValues: null,
      comment: `Workday info record deleted for wdid "${wdid}"`,
    });

    res.status(204).send();
  } catch (err) {
    error(err);
    res.status(500).json({ error: 'Failed to delete workday info record' });
  }
});

export default router;
