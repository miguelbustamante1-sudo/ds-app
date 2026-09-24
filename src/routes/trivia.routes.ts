import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { recordAnswer } from '../services/trivia/components/RecordAnswer';
import { pullNewBatch, updateQuestion, deleteQuestion } from '../services/trivia/TriviaOrchestrator';
import { getLatestBatch } from '../services/trivia/queries/getLatestBatch';
import { listQuestionsForAdmin } from '../services/trivia/queries/listQuestionsForAdmin';
import type { SubmitTriviaAnswerDTO, UpdateTriviaQuestionDTO } from '@shared/dto';

const router = Router();

/**
 * POST /api/trivia/batches
 * Admin-only. Starts a new batch pull from the SOP knowledge base. Returns
 * immediately with the new batch's id; generation continues async. 409 if a
 * batch is already pending — enforced at the DB level via a partial unique
 * index, this check is just the fast-path early return.
 */
router.post('/batches', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId || !req.user.email) {
      throw new AppError('Unauthenticated', 401);
    }
    const result = await pullNewBatch(req.user.dsUserId, req.user.email);
    res.status(202).json({ data: result });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trivia/batches/latest
 * Admin-only. Returns the most recent batch's status for the maintenance
 * page to poll while a pull is pending.
 */
router.get('/batches/latest', requireRole('admin'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const batch = await getLatestBatch();
    res.json({ data: batch });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trivia/questions
 * Admin-only. Lists all trivia questions (active and inactive) for the CRUD
 * maintenance page.
 */
router.get('/questions', requireRole('admin'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const questions = await listQuestionsForAdmin();
    res.json({ data: questions });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/trivia/questions/:id
 * Admin-only. Currently supports toggling isActive.
 */
router.patch('/questions/:id', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.dsUserId || !req.user.email) {
      throw new AppError('Unauthenticated', 401);
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new AppError('Invalid question id', 400);
    }
    const body = req.body as UpdateTriviaQuestionDTO;
    const updated = await updateQuestion(id, body, req.user.dsUserId, req.user.email);
    res.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/trivia/questions/:id
 * Admin-only.
 */
router.delete('/questions/:id', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.email) {
      throw new AppError('Unauthenticated', 401);
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new AppError('Invalid question id', 400);
    }
    await deleteQuestion(id, req.user.email);
    res.status(204).send();
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trivia/answers
 * Submits (or updates, if already answered) the calling user's answer to a
 * trivia question. Returns whether it was correct and the correct option
 * index so the frontend can reveal the answer.
 */
router.post('/answers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamMemberId = req.user?.teamMemberId;
    if (!teamMemberId) {
      res.status(400).json({ error: 'Team member ID not found on authenticated user.' });
      return;
    }
    if (!req.user?.email) {
      throw new AppError('Unauthenticated', 401);
    }
    const { questionId, selectedOptionIndex } = req.body as SubmitTriviaAnswerDTO;
    const result = await recordAnswer(questionId, teamMemberId, selectedOptionIndex, req.user.email);
    res.json({ data: result });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
