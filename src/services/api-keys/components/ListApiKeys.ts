import { prisma } from '../../../db/prisma';
import type { ApiKeyDTO } from '@shared/dto';

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
    createdByUserName: row.createdByUser.userName,
  }));
}
