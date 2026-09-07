import express from 'express';
import type { Request, Response } from 'express';
import {
  supervisorAssignmentOrchestrator,
  SelfAssignmentError,
} from '../services/supervisorAssignment';
import { requirePermission } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { CreateSupervisorAssignmentDTO, UpdateSupervisorAssignmentDTO, TransferSupervisorAssignmentsDTO } from '@shared/dto/SupervisorAssignment';

const router = express.Router();

// GET /supervisor-assignments
router.get('/', requirePermission('SupervisorAssignments', 'read'), async (_req: Request, res: Response) => {
  try {
    const items = await supervisorAssignmentOrchestrator.getAll();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supervisor assignments' });
  }
});

// GET /supervisor-assignments/team-member/:tms_id
router.get('/team-member/:tms_id', requirePermission('SupervisorAssignments', 'read'), async (req: Request, res: Response) => {
  try {
    const tmsId = Number(req.params.tms_id);
    if (Number.isNaN(tmsId)) return res.status(400).json({ error: 'Invalid team member id' });

    const items = await supervisorAssignmentOrchestrator.getByTeamMember(tmsId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supervisor assignments by team member' });
  }
});

// GET /supervisor-assignments/supervisor/:sup_id
router.get('/supervisor/:sup_id', requirePermission('SupervisorAssignments', 'read'), async (req: Request, res: Response) => {
  try {
    const supId = Number(req.params.sup_id);
    if (Number.isNaN(supId)) return res.status(400).json({ error: 'Invalid supervisor id' });

    const items = await supervisorAssignmentOrchestrator.getBySupervisor(supId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supervisor assignments by supervisor' });
  }
});

// POST /supervisor-assignments/transfer
router.post('/transfer', requirePermission('SupervisorAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromSupervisorId, toSupervisorId } = req.body as TransferSupervisorAssignmentsDTO;

    if (!fromSupervisorId) return res.status(400).json({ error: 'fromSupervisorId is required' });
    if (!toSupervisorId) return res.status(400).json({ error: 'toSupervisorId is required' });

    const result = await supervisorAssignmentOrchestrator.transfer(
      fromSupervisorId,
      toSupervisorId,
      req.user!.email,
      req.user!.dsUserId,
    );

    res.json({ data: result });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// GET /supervisor-assignments/:id
router.get('/:id', requirePermission('SupervisorAssignments', 'read'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const item = await supervisorAssignmentOrchestrator.getById(id);
    if (!item) return res.status(404).json({ error: 'Supervisor assignment not found' });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supervisor assignment' });
  }
});

// POST /supervisor-assignments
router.post('/', requirePermission('SupervisorAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as CreateSupervisorAssignmentDTO;

    if (!body.teamMemberId) return res.status(400).json({ error: 'teamMemberId is required' });
    if (!body.supervisorId) return res.status(400).json({ error: 'supervisorId is required' });
    if (!body.supervisorAssignmentStartDate) return res.status(400).json({ error: 'supervisorAssignmentStartDate is required' });

    const created = await supervisorAssignmentOrchestrator.create(body, req.user!.email, req.user!.dsUserId);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof SelfAssignmentError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create supervisor assignment' });
  }
});

// PUT /supervisor-assignments/:id
router.put('/:id', requirePermission('SupervisorAssignments', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const body = req.body as UpdateSupervisorAssignmentDTO;

    const updated = await supervisorAssignmentOrchestrator.update(id, body, req.user!.email, req.user!.dsUserId);
    if (!updated) return res.status(404).json({ error: 'Supervisor assignment not found' });

    res.json(updated);
  } catch (err) {
    if (err instanceof SelfAssignmentError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update supervisor assignment' });
  }
});

// DELETE /supervisor-assignments/:id
router.delete('/:id', requirePermission('SupervisorAssignments', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await supervisorAssignmentOrchestrator.delete(id, req.user!.email);

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supervisor assignment' });
  }
});

export default router;
