import type { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma';
import type { AuthenticatedRequest } from './auth';
import type { PermissionMap } from '../services/permissionResolver';

export async function validateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey || typeof rawKey !== 'string') {
    // No API key header — let the existing JWT auth path proceed
    next();
    return;
  }

  const serviceAccountId = Number(process.env.API_SERVICE_ACCOUNT_DS_USER_ID);
  if (!serviceAccountId) {
    console.error('API_SERVICE_ACCOUNT_DS_USER_ID is not configured');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  // Use the stored 8-char prefix to fetch at most one candidate row.
  // Rows created before the prefix column was added have apkPrefix = null and
  // are excluded here; they will fail validation until rotated (expected).
  const prefix = rawKey.substring(0, 8);
  const candidate = await prisma.apiKey.findFirst({
    where: { apkIsActive: true, apkPrefix: prefix },
    select: { apkId: true, apkKeyHash: true, apkPermissions: true },
  });

  if (candidate) {
    const match = await bcrypt.compare(rawKey, candidate.apkKeyHash);
    if (match) {
      const key = candidate;
      // fire-and-forget: update last used date — never blocks the request
      void prisma.apiKey.update({
        where: { apkId: key.apkId },
        data: { apkLastUsedDate: new Date() },
      }).catch((err: unknown) => {
        console.error('Failed to update apk_last_used_date:', err);
      });

      const permissions = key.apkPermissions as PermissionMap;

      req.user = {
        id: serviceAccountId,
        email: 'api-service@internal',
        roles: [],
        permissions,
        dsUserId: serviceAccountId,
      };
      req.apiKeyId = key.apkId;
      next();
      return;
    }
  }

  res.status(401).json({ error: 'Unauthorized' });
}
