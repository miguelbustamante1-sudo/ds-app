import { prisma } from '../../../db/prisma';
import { PermissionCatalogEntryNotFoundError } from '../errors';
import type { ApiPermissionCatalogDTO } from '@shared/dto';

export async function deletePermissionCatalogEntry(
  apcId: number,
): Promise<{ before: ApiPermissionCatalogDTO; after: ApiPermissionCatalogDTO }> {
  const before = await prisma.apiPermissionCatalog.findUnique({ where: { apcId } });
  if (!before) throw new PermissionCatalogEntryNotFoundError();

  const after = await prisma.apiPermissionCatalog.update({
    where: { apcId },
    data: { apcIsActive: false },
  });

  const toDTO = (row: typeof before): ApiPermissionCatalogDTO => ({
    apcId: row.apcId,
    apcResource: row.apcResource,
    apcAction: row.apcAction as 'read' | 'create' | 'delete',
    apcLabel: row.apcLabel,
    apcIsActive: row.apcIsActive,
  });

  return { before: toDTO(before), after: toDTO(after) };
}
