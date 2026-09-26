import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { holidaySwapOrchestrator } from '../services/holidaySwap/HolidaySwapOrchestrator';
import type { CreateHolidaySwapDTO, ReviewHolidaySwapDTO, CancelHolidaySwapDTO, UpdateHolidaySwapDTO } from '@shared/dto/HolidaySwap';
import { getActiveSwapsForTM } from '../services/holidaySwap/queries/getActiveSwapsForTM';
import { prisma } from '../db/prisma';
import { AppError } from '../errors/AppError';
import { auditOrchestrator } from '../services/audit/AuditOrchestrator';
import { canViewSwap } from '../services/holidaySwap/canViewSwap';
import {
  HolidaySwapNotFoundError,
  InvalidHolidaySwapIdError,
  HolidaySwapAccessDeniedError,
  MissingTeamMemberIdError,
} from '../services/holidaySwap/errors';
import type { AuditHistoryEntryDTO } from '@shared/dto/AuditHistory';

const HSW_ENTITY_NAME = 'hsw_holiday_swap';

const router = Router();

// ---------------------------------------------------------------------------
// TM — self-service
// ---------------------------------------------------------------------------

/** GET /api/holiday-swaps/my/active-swaps — acknowledged + active swaps for the caller */
// Declared BEFORE /my to prevent Express matching 'active-swaps' as /:id
router.get(
  '/my/active-swaps',
  requirePermission('HolidaySwaps', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = req.user?.teamMemberId;
      if (!teamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const swaps = await getActiveSwapsForTM(teamMemberId);
      res.json(swaps);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

/** GET /api/holiday-swaps/my — list my swaps */
router.get(
  '/my',
  requirePermission('HolidaySwaps', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = req.user?.teamMemberId;
      if (!teamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const swaps = await holidaySwapOrchestrator.getMySwaps(teamMemberId);
      res.json(swaps);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

/** POST /api/holiday-swaps/my — submit a new swap */
router.post(
  '/my',
  requirePermission('HolidaySwaps', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = req.user?.teamMemberId;
      const createdBy = req.user?.email ?? 'unknown';
      if (!teamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      if (!req.user?.dsUserId) {
        throw new AppError('Unauthenticated', 401);
      }
      const input: CreateHolidaySwapDTO = req.body;
      const swap = await holidaySwapOrchestrator.createSwap(teamMemberId, input, createdBy, req.user.dsUserId);
      res.status(201).json(swap);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  }
);

/** PATCH /api/holiday-swaps/my/:id/cancel — TM cancels a swap */
router.patch(
  '/my/:id/cancel',
  requirePermission('HolidaySwaps', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = req.user?.teamMemberId;
      const updatedBy = req.user?.email ?? 'unknown';
      if (!teamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) {
        res.status(400).json({ error: 'Invalid swap ID.' });
        return;
      }
      const input: CancelHolidaySwapDTO = req.body;
      const swap = await holidaySwapOrchestrator.cancelSwap(swapId, teamMemberId, updatedBy, input);
      res.json(swap);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  }
);

// ---------------------------------------------------------------------------
// Supervisor
// ---------------------------------------------------------------------------

/** POST /api/holiday-swaps/team/:teamMemberId — supervisor creates a swap on behalf of TM */
router.post(
  '/team/:teamMemberId',
  requirePermission('HolidaySwaps', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorTeamMemberId = req.user?.teamMemberId;
      const createdBy = req.user?.email ?? 'unknown';
      if (!supervisorTeamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      if (!req.user?.dsUserId) {
        throw new AppError('Unauthenticated', 401);
      }
      const targetTeamMemberId = parseInt(req.params.teamMemberId ?? '', 10);
      if (isNaN(targetTeamMemberId)) {
        res.status(400).json({ error: 'Invalid team member ID.' });
        return;
      }
      const input: CreateHolidaySwapDTO = req.body;
      const swap = await holidaySwapOrchestrator.createSwapForMember(
        supervisorTeamMemberId,
        targetTeamMemberId,
        input,
        createdBy,
        req.user.dsUserId
      );
      res.status(201).json(swap);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Access denied') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  }
);

/** GET /api/holiday-swaps/team/:teamMemberId — supervisor views TM's swaps */
router.get(
  '/team/:teamMemberId',
  requirePermission('HolidaySwaps', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorTeamMemberId = req.user?.teamMemberId;
      if (!supervisorTeamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const targetTeamMemberId = parseInt(req.params.teamMemberId ?? '', 10);
      if (isNaN(targetTeamMemberId)) {
        res.status(400).json({ error: 'Invalid team member ID.' });
        return;
      }
      const viewAll = req.user?.permissions?.TLTeam?.read === true;
      const swaps = await holidaySwapOrchestrator.getTeamMemberSwaps(
        supervisorTeamMemberId,
        targetTeamMemberId,
        viewAll
      );
      res.json(swaps);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Access denied') ? 403 : 500;
      res.status(status).json({ error: message });
    }
  }
);

/** GET /api/holiday-swaps/team/:teamMemberId/active-swaps — supervisor views TM's active swaps */
router.get(
  '/team/:teamMemberId/active-swaps',
  requirePermission('HolidaySwaps', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorTeamMemberId = req.user?.teamMemberId;
      if (!supervisorTeamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const targetTeamMemberId = parseInt(req.params.teamMemberId ?? '', 10);
      if (isNaN(targetTeamMemberId)) {
        res.status(400).json({ error: 'Invalid team member ID.' });
        return;
      }
      const viewAll = req.user?.permissions?.TLTeam?.read === true;
      const swaps = await holidaySwapOrchestrator.getActiveTeamMemberSwaps(
        supervisorTeamMemberId,
        targetTeamMemberId,
        viewAll
      );
      res.json(swaps);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Access denied') ? 403 : 500;
      res.status(status).json({ error: message });
    }
  }
);

/** PATCH /api/holiday-swaps/team/:id — supervisor updates a TM's swap */
router.patch(
  '/team/:id',
  requirePermission('HolidaySwaps', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorTeamMemberId = req.user?.teamMemberId;
      const updatedBy = req.user?.email ?? 'unknown';
      if (!supervisorTeamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      if (!req.user?.dsUserId) {
        throw new AppError('Unauthenticated', 401);
      }
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) {
        res.status(400).json({ error: 'Invalid swap ID.' });
        return;
      }
      const input: UpdateHolidaySwapDTO = req.body;
      const swap = await holidaySwapOrchestrator.updateSwapForMember(
        swapId,
        supervisorTeamMemberId,
        input,
        updatedBy,
        req.user.dsUserId
      );
      res.json(swap);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Access denied') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  }
);

/** PATCH /api/holiday-swaps/team/:id/cancel — supervisor cancels a TM's swap */
router.patch(
  '/team/:id/cancel',
  requirePermission('HolidaySwaps', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorTeamMemberId = req.user?.teamMemberId;
      const updatedBy = req.user?.email ?? 'unknown';
      if (!supervisorTeamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) {
        res.status(400).json({ error: 'Invalid swap ID.' });
        return;
      }
      const input: CancelHolidaySwapDTO = req.body;
      const swap = await holidaySwapOrchestrator.cancelSwapForMember(
        swapId,
        supervisorTeamMemberId,
        updatedBy,
        input
      );
      res.json(swap);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Access denied') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  }
);

/** GET /api/holiday-swaps/:id — single swap detail with role + available actions */
router.get(
  '/:id',
  requirePermission('HolidaySwaps', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = req.user?.teamMemberId;
      if (!teamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) {
        res.status(400).json({ error: 'Invalid swap ID.' });
        return;
      }
      const detail = await holidaySwapOrchestrator.getSwapDetail(swapId, teamMemberId);
      res.json(detail);
    } catch (err: unknown) {
      const statusCode = (err as Record<string, unknown>).statusCode;
      if (statusCode === 404) {
        res.status(404).json({ error: 'Holiday swap not found.' });
        return;
      }
      if (statusCode === 403) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

/** GET /api/holiday-swaps/:id/history — audit history for a single swap */
router.get(
  '/:id/history',
  requirePermission('HolidaySwaps', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamMemberId = req.user?.teamMemberId;
      if (!teamMemberId) throw new MissingTeamMemberIdError();

      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) throw new InvalidHolidaySwapIdError();

      const swap = await prisma.holidaySwap.findUnique({
        where: { holidaySwapId: swapId },
        select: { teamMemberId: true },
      });
      if (!swap) throw new HolidaySwapNotFoundError();

      if (!(await canViewSwap(teamMemberId, swap.teamMemberId))) {
        throw new HolidaySwapAccessDeniedError();
      }

      const history = await auditOrchestrator.getHistory(HSW_ENTITY_NAME, String(swapId));
      const data: AuditHistoryEntryDTO[] = history.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        createdBy: row.createdBy,
        comment: row.comment,
        oldValues: row.oldValues as Record<string, unknown> | null,
        newValues: row.newValues as Record<string, unknown> | null,
      }));

      res.json({ data });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

/** PATCH /api/holiday-swaps/:id/review — supervisor approves or rejects */
router.patch(
  '/:id/review',
  requirePermission('HolidaySwaps', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supervisorTeamMemberId = req.user?.teamMemberId;
      const updatedBy = req.user?.email ?? 'unknown';
      if (!supervisorTeamMemberId) {
        res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
        return;
      }
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) {
        res.status(400).json({ error: 'Invalid swap ID.' });
        return;
      }
      const input: ReviewHolidaySwapDTO = req.body;
      const swap = await holidaySwapOrchestrator.reviewSwap(
        swapId,
        supervisorTeamMemberId,
        input,
        updatedBy
      );
      res.json(swap);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Access denied') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  }
);

export default router;
