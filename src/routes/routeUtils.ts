import { Response } from 'express';
import { AppError } from '../errors/AppError';
import type { AuthenticatedRequest } from '../middleware/auth';

export function dsUserId(req: AuthenticatedRequest): number {
  const id = req.user?.dsUserId;
  if (!id) throw new AppError('Unauthenticated', 401);
  return id;
}

export function actorEmail(req: AuthenticatedRequest): string {
  const email = req.user?.email;
  if (!email) throw new AppError('Unauthenticated', 401);
  return email;
}

export function catchHandler(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}
