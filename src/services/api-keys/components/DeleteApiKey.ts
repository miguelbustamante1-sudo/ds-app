import { prisma } from '../../../db/prisma';
import type { ApiKeyDTO } from '@shared/dto';
import type { PermissionMap } from '@shared/types/permissions';
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
    apkPermissions: existing.apkPermissions as PermissionMap,
    createdByUserName: existing.createdByUser.userName,
  };
}
