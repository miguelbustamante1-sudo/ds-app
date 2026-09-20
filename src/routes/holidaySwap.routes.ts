import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { holidaySwapOrchestrator } from '../services/holidaySwap/HolidaySwapOrchestrator';
import type { CreateHolidaySwapDTO, ReviewHolidaySwapDTO, CancelHolidaySwapDTO, UpdateHolidaySwapDTO } from '@shared/dto/HolidaySwap';
import { getActiveSwapsForTM } from '../services/holidaySwap/queries/getActiveSwapsForTM';

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
      const input: CreateHolidaySwapDTO = req.body;
      const swap = await holidaySwapOrchestrator.createSwap(teamMemberId, input, createdBy);
      res.status(201).json(swap);
    } catch (err: unknown) {
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
        createdBy
      );
      res.status(201).json(swap);
    } catch (err: unknown) {
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
      const swaps = await holidaySwapOrchestrator.getTeamMemberSwaps(
        supervisorTeamMemberId,
        targetTeamMemberId
      );
      res.json(swaps);
    } catch (err: unknown) {
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
      const swaps = await holidaySwapOrchestrator.getActiveTeamMemberSwaps(
        supervisorTeamMemberId,
        targetTeamMemberId
      );
      res.json(swaps);
    } catch (err: unknown) {
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
        updatedBy
      );
      res.json(swap);
    } catch (err: unknown) {
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
      const message = err instanceof Error ? err.message : 'Internal server error';
      const status = message.includes('Access denied') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  }
);

export default router;
