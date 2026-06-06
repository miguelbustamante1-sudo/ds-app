import { prisma } from '../../../db/prisma';
import type { ApiKeyDTO } from '@shared/dto';
import { ApiKeyNotFoundError, ApiKeyAlreadyRevokedError } from '../errors';

export async function revokeApiKey(apkId: number): Promise<{ before: ApiKeyDTO; after: ApiKeyDTO }> {
  const existing = await prisma.apiKey.findUnique({
    where: { apkId },
    include: { createdByUser: { select: { userName: true } } },
  });
  if (!existing) throw new ApiKeyNotFoundError();
  if (!existing.apkIsActive) throw new ApiKeyAlreadyRevokedError();

  const updated = await prisma.apiKey.update({
    where: { apkId },
    data: { apkIsActive: false },
    include: { createdByUser: { select: { userName: true } } },
  });

  const toDTO = (row: typeof existing): ApiKeyDTO => ({
    apkId: row.apkId,
    apkName: row.apkName,
    apkIsActive: row.apkIsActive,
    apkCreatedBy: row.apkCreatedBy,
    apkCreatedDate: row.apkCreatedDate.toISOString(),
    apkLastUsedDate: row.apkLastUsedDate ? row.apkLastUsedDate.toISOString() : null,
    createdByUserName: row.createdByUser.userName,
  });

  return { before: toDTO(existing), after: toDTO(updated) };
}
