import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { recordAnswer } from '../services/trivia/components/RecordAnswer';
import type { SubmitTriviaAnswerDTO } from '@shared/dto';

const router = Router();

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
