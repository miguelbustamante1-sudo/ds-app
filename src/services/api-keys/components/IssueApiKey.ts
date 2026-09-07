import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../../../db/prisma';
import type { IssueApiKeyDTO, IssueApiKeyResponseDTO } from '@shared/dto';
import { AppError } from '../../../errors/AppError';
import { UnknownPermissionError } from '../errors';

const BCRYPT_COST = 10;

export async function issueApiKey(
  input: IssueApiKeyDTO,
  createdBy: number,
): Promise<IssueApiKeyResponseDTO> {
  if (!input.apkName?.trim()) {
    throw new AppError('Key name is required', 400);
  }

  const requestedGrants: Array<{ resource: string; action: 'read' | 'create' | 'delete' }> = [];
  for (const [resource, flags] of Object.entries(input.apkPermissions)) {
    for (const action of ['read', 'create', 'delete'] as const) {
      if (flags[action]) requestedGrants.push({ resource, action });
    }
  }

  if (requestedGrants.length > 0) {
    const activeCatalog = await prisma.apiPermissionCatalog.findMany({
      where: { apcIsActive: true },
      select: { apcResource: true, apcAction: true },
    });
    const allowed = new Set(activeCatalog.map((c) => `${c.apcResource}.${c.apcAction}`));
    for (const { resource, action } of requestedGrants) {
      if (!allowed.has(`${resource}.${action}`)) {
        throw new UnknownPermissionError(resource, action);
      }
    }
  }

  const rawKey = crypto.randomBytes(32).toString('hex');
  const apkKeyHash = await bcrypt.hash(rawKey, BCRYPT_COST);
  const apkPrefix = rawKey.substring(0, 8);

  const created = await prisma.apiKey.create({
    data: {
      apkName: input.apkName.trim(),
      apkKeyHash,
      apkPrefix,
      apkIsActive: true,
      apkCreatedBy: createdBy,
      apkPermissions: input.apkPermissions,
    },
    select: { apkId: true, apkName: true },
  });

  return {
    apkId: created.apkId,
    apkName: created.apkName,
    rawKey,
  };
}
