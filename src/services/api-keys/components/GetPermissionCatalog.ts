import { prisma } from '../../../db/prisma';
import type { ApiPermissionCatalogDTO } from '@shared/dto';

export async function getActivePermissionCatalog(): Promise<ApiPermissionCatalogDTO[]> {
  const rows = await prisma.apiPermissionCatalog.findMany({
    where: { apcIsActive: true },
    orderBy: { apcId: 'asc' },
  });

  return rows.map((r) => ({
    apcId: r.apcId,
    apcResource: r.apcResource,
    apcAction: r.apcAction as 'read' | 'create' | 'delete',
    apcLabel: r.apcLabel,
  }));
}
