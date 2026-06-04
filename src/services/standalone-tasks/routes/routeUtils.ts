import { Response } from 'express';
import { AppError } from '../../../errors/AppError';
import type { AuthenticatedRequest } from '../../../middleware/auth';

export function dsUserId(req: AuthenticatedRequest): number {
  const id = req.user?.dsUserId;
  if (!id) throw new AppError('Unauthenticated', 401);
  return id;
}

export function tmId(req: AuthenticatedRequest): number {
  const id = req.user?.teamMemberId;
  if (!id) throw new AppError('Unauthenticated', 401);
  return id;
}

export function catchHandler(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}
