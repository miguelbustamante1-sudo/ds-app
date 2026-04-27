import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { bsaHolidaySwapOrchestrator } from '../services/holidaySwap/BsaHolidaySwapOrchestrator';
import type {
  ReviewHolidaySwapDTO,
  CancelHolidaySwapDTO,
  UpdateHolidaySwapDTO,
} from '@shared/dto/HolidaySwap';
import type { CreateExceptionHolidaySwapDTO } from '@shared/dto/HolidaySwap';

const router = Router();

/** GET /api/holiday-swaps/exception/:teamMemberId — list TM swaps */
router.get(
  '/exception/:teamMemberId',
  requirePermission('HolidaySwapException', 'read'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetTeamMemberId = parseInt(req.params.teamMemberId ?? '', 10);
      if (isNaN(targetTeamMemberId)) {
        res.status(400).json({ error: 'Invalid team member ID.' });
        return;
      }
      const swaps = await bsaHolidaySwapOrchestrator.getTeamMemberSwapsException(targetTeamMemberId);
      res.json(swaps);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

/** POST /api/holiday-swaps/exception/:teamMemberId — create swap */
router.post(
  '/exception/:teamMemberId',
  requirePermission('HolidaySwapException', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bsaEmail = req.user?.email ?? 'unknown';
      const targetTeamMemberId = parseInt(req.params.teamMemberId ?? '', 10);
      if (isNaN(targetTeamMemberId)) {
        res.status(400).json({ error: 'Invalid team member ID.' });
        return;
      }
      const input: CreateExceptionHolidaySwapDTO = req.body;
      const swap = await bsaHolidaySwapOrchestrator.createSwapException(
        targetTeamMemberId,
        input,
        bsaEmail
      );
      res.status(201).json(swap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  }
);

/** PATCH /api/holiday-swaps/exception/:id — update swap */
router.patch(
  '/exception/:id',
  requirePermission('HolidaySwapException', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bsaEmail = req.user?.email ?? 'unknown';
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) {
        res.status(400).json({ error: 'Invalid swap ID.' });
        return;
      }
      const input: UpdateHolidaySwapDTO = req.body;
      const swap = await bsaHolidaySwapOrchestrator.updateSwapException(swapId, input, bsaEmail);
      res.json(swap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  }
);

/** PATCH /api/holiday-swaps/exception/:id/cancel — cancel swap */
router.patch(
  '/exception/:id/cancel',
  requirePermission('HolidaySwapException', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bsaEmail = req.user?.email ?? 'unknown';
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) {
        res.status(400).json({ error: 'Invalid swap ID.' });
        return;
      }
      const input: CancelHolidaySwapDTO = req.body;
      const swap = await bsaHolidaySwapOrchestrator.cancelSwapException(swapId, bsaEmail, input);
      res.json(swap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  }
);

/** PATCH /api/holiday-swaps/exception/:id/review — approve or reject */
router.patch(
  '/exception/:id/review',
  requirePermission('HolidaySwapException', 'create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bsaEmail = req.user?.email ?? 'unknown';
      const swapId = parseInt(req.params.id ?? '', 10);
      if (isNaN(swapId)) {
        res.status(400).json({ error: 'Invalid swap ID.' });
        return;
      }
      const input: ReviewHolidaySwapDTO = req.body;
      const swap = await bsaHolidaySwapOrchestrator.reviewSwapException(swapId, input, bsaEmail);
      res.json(swap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(400).json({ error: message });
    }
  }
);

export default router;
