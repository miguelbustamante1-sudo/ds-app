import { prisma } from '../../../db/prisma';
import type { ApiKeyDTO } from '@shared/dto';
import type { PermissionMap } from '@shared/types/permissions';

export async function listApiKeys(): Promise<ApiKeyDTO[]> {
  const rows = await prisma.apiKey.findMany({
    orderBy: { apkCreatedDate: 'desc' },
    include: {
      createdByUser: { select: { userName: true } },
    },
  });

  return rows.map((row) => ({
    apkId: row.apkId,
    apkName: row.apkName,
    apkIsActive: row.apkIsActive,
    apkCreatedBy: row.apkCreatedBy,
    apkCreatedDate: row.apkCreatedDate.toISOString(),
    apkLastUsedDate: row.apkLastUsedDate ? row.apkLastUsedDate.toISOString() : null,
    apkPermissions: row.apkPermissions as PermissionMap,
    createdByUserName: row.createdByUser.userName,
  }));
}
