import express from 'express';
import type { Response } from 'express';
import { otherIncomeOrchestrator } from '../services/otherIncomes';
import { getReportsForOtherIncomes } from '../services/teamMember/queries/getReportsForOtherIncomes';
import { getTeamMemberById } from '../db/teamMembers';
import { requirePermission, requireRole } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { CreateOtherIncomeDTO, UpdateOtherIncomeDTO } from '@shared/dto/OtherIncome';
import type { SubmitOtherIncomeImportEntriesDTO } from '@shared/dto/OtherIncomeImport';

const router = express.Router();

function catchBlock(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}

function isAdminCaller(req: AuthenticatedRequest): boolean {
  const hasPayrollAdminRead = req.user?.permissions?.PayrollAdmin?.read === true;
  const hasBsaRole = req.user?.roles?.includes('bsa') ?? false;
  return hasPayrollAdminRead && hasBsaRole;
}

/**
 * oin_other_incomes keys authorizer/team-member on Workday ID, while
 * req.user.teamMemberId is the internal id — resolve it once per request.
 */
async function getCallerWdid(teamMemberId: number): Promise<string | undefined> {
  const teamMember = await getTeamMemberById(teamMemberId);
  return teamMember?.workdayId ?? undefined;
}

// GET /other-incomes/lookups/payrol-periods — Open-only, no PayrollAdmin/bsa gate.
// Two path segments, so this never collides with GET /:id regardless of registration order.
router.get(
  '/lookups/payrol-periods',
  requirePermission('OtherIncomes', 'read'),
  async (_req, res: Response) => {
    try {
      const items = await otherIncomeOrchestrator.getOpenPayrolPeriods();
      res.json({ data: items });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// GET /other-incomes?scope=team|all
router.get('/', requirePermission('OtherIncomes', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (teamMemberId === undefined) throw new AppError('Unauthenticated', 401);

    const scope = req.query.scope === 'all' ? 'all' : 'team';
    const isAdmin = isAdminCaller(req);

    if (scope === 'all') {
      if (!isAdmin) {
        res.status(403).json({ error: 'Insufficient permissions for org-wide scope' });
        return;
      }
      const items = await otherIncomeOrchestrator.getAll({ isAdmin: true });
      res.json({ data: items });
      return;
    }

    const teamMemberWdids = await getReportsForOtherIncomes(teamMemberId, false);
    const actingTeamMemberWdid = await getCallerWdid(teamMemberId);
    const items = await otherIncomeOrchestrator.getAll({
      isAdmin: false,
      teamMemberWdids,
      ...(actingTeamMemberWdid !== undefined && { actingTeamMemberWdid }),
    });
    res.json({ data: items });
  } catch (err) {
    catchBlock(err, res);
  }
});

// GET /other-incomes/:id
router.get('/:id', requirePermission('OtherIncomes', 'read'), async (req, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const item = await otherIncomeOrchestrator.getById(id);
    res.json({ data: item });
  } catch (err) {
    catchBlock(err, res);
  }
});

// POST /other-incomes
router.post(
  '/',
  requirePermission('OtherIncomes', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
      const body = req.body as CreateOtherIncomeDTO;

      if (!body.teamMemberWdid) { res.status(400).json({ error: 'teamMemberWdid is required' }); return; }
      if (!body.incomeTypeId) { res.status(400).json({ error: 'incomeTypeId is required' }); return; }
      if (body.oinAmount === undefined || body.oinAmount === null) {
        res.status(400).json({ error: 'oinAmount is required' }); return;
      }
      if (!body.oinCuantity) { res.status(400).json({ error: 'oinCuantity is required' }); return; }
      if (!body.oinMeasurment) { res.status(400).json({ error: 'oinMeasurment is required' }); return; }
      if (!body.payrolId) { res.status(400).json({ error: 'payrolId is required' }); return; }

      const created = await otherIncomeOrchestrator.create(body, req.user.email, req.user.dsUserId);
      res.status(201).json({ data: created });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// PUT /other-incomes/:id
router.put(
  '/:id',
  requirePermission('OtherIncomes', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
      const id = Number(req.params.id);
      if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

      const updated = await otherIncomeOrchestrator.update(
        id,
        req.body as UpdateOtherIncomeDTO,
        req.user.email,
        req.user.dsUserId,
        { isAdmin: isAdminCaller(req), actingUserId: req.user.dsUserId },
      );
      res.json({ data: updated });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// DELETE /other-incomes/:id
router.delete(
  '/:id',
  requirePermission('OtherIncomes', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
      const id = Number(req.params.id);
      if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

      await otherIncomeOrchestrator.delete(
        id,
        req.user.email,
        req.user.dsUserId,
        { isAdmin: isAdminCaller(req), actingUserId: req.user.dsUserId },
      );
      res.status(204).send();
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// POST /other-incomes/:id/approve
router.post(
  '/:id/approve',
  requirePermission('OtherIncomes', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
      const id = Number(req.params.id);
      if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

      const actingTeamMemberWdid =
        req.user.teamMemberId !== undefined ? await getCallerWdid(req.user.teamMemberId) : undefined;
      const updated = await otherIncomeOrchestrator.approve(id, req.user.email, req.user.dsUserId, {
        isAdmin: isAdminCaller(req),
        ...(actingTeamMemberWdid !== undefined && { actingTeamMemberWdid }),
      });
      res.json({ data: updated });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// POST /other-incomes/:id/reject
router.post(
  '/:id/reject',
  requirePermission('OtherIncomes', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);
      const id = Number(req.params.id);
      if (Number.isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

      const body = req.body as { reason?: string };
      const actingTeamMemberWdid =
        req.user.teamMemberId !== undefined ? await getCallerWdid(req.user.teamMemberId) : undefined;
      const updated = await otherIncomeOrchestrator.reject(id, body.reason ?? '', req.user.email, req.user.dsUserId, {
        isAdmin: isAdminCaller(req),
        ...(actingTeamMemberWdid !== undefined && { actingTeamMemberWdid }),
      });
      res.json({ data: updated });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// POST /other-incomes/bulk-delete
router.post(
  '/bulk-delete',
  requirePermission('PayrollAdmin', 'delete'),
  requireRole('bsa'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);

      const body = req.body as { oinIds?: number[] };
      if (!Array.isArray(body.oinIds) || body.oinIds.length === 0) {
        throw new AppError('oinIds must be a non-empty array', 400);
      }

      await otherIncomeOrchestrator.bulkDelete(body.oinIds, req.user.email, req.user.dsUserId);
      res.status(204).send();
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

// POST /other-incomes/import
router.post(
  '/import',
  requirePermission('PayrollAdmin', 'create'),
  requireRole('bsa'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.dsUserId) throw new AppError('Unauthenticated', 401);

      const body = req.body as SubmitOtherIncomeImportEntriesDTO;
      if (!Array.isArray(body.entries) || body.entries.length === 0) {
        throw new AppError('entries must be a non-empty array', 400);
      }

      const result = await otherIncomeOrchestrator.submitImport(body.entries, req.user.email, req.user.dsUserId);
      res.status(200).json({ data: result });
    } catch (err) {
      catchBlock(err, res);
    }
  },
);

export default router;
