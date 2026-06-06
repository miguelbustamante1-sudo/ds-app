import { prisma } from '../../../db/prisma';
import type { ApiKeyDTO } from '@shared/dto';
import { ApiKeyNotFoundError, ApiKeyHasBeenUsedError } from '../errors';

export async function deleteApiKey(apkId: number): Promise<ApiKeyDTO> {
  const existing = await prisma.apiKey.findUnique({
    where: { apkId },
    include: { createdByUser: { select: { userName: true } } },
  });
  if (!existing) throw new ApiKeyNotFoundError();
  if (existing.apkLastUsedDate !== null) throw new ApiKeyHasBeenUsedError();

  await prisma.apiKey.delete({ where: { apkId } });

  return {
    apkId: existing.apkId,
    apkName: existing.apkName,
    apkIsActive: existing.apkIsActive,
    apkCreatedBy: existing.apkCreatedBy,
    apkCreatedDate: existing.apkCreatedDate.toISOString(),
    apkLastUsedDate: null,
    createdByUserName: existing.createdByUser.userName,
  };
}
