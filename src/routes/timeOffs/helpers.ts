import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';

export interface ResolvedAuthRequest extends AuthenticatedRequest {
  teamMemberId: number;
  resolvedUserId: number | null;
}

export async function resolveAuthUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.email) return res.status(401).json({ error: 'User not authenticated' });

  const teamMemberId = req.user.teamMemberId;
  if (!teamMemberId) return res.status(404).json({ error: 'Team member not found for current user' });

  (req as ResolvedAuthRequest).teamMemberId = teamMemberId;
  (req as ResolvedAuthRequest).resolvedUserId = req.user.dsUserId ?? null;
  next();
}

export function parseIdParam(value: string | undefined): number | null {
  if (value === undefined) return null;
  const id = Number(value);
  return Number.isNaN(id) ? null : id;
}
