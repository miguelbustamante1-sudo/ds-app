import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { PermissionCatalogEntryNotFoundError } from '../errors';
import type { ApiPermissionCatalogDTO, UpdatePermissionCatalogEntryDTO } from '@shared/dto';

export async function updatePermissionCatalogEntry(
  apcId: number,
  input: UpdatePermissionCatalogEntryDTO,
): Promise<{ before: ApiPermissionCatalogDTO; after: ApiPermissionCatalogDTO }> {
  const before = await prisma.apiPermissionCatalog.findUnique({ where: { apcId } });
  if (!before) throw new PermissionCatalogEntryNotFoundError();

  if (input.apcLabel !== undefined && !input.apcLabel.trim()) {
    throw new AppError('Label is required', 400);
  }

  const after = await prisma.apiPermissionCatalog.update({
    where: { apcId },
    data: {
      ...(input.apcLabel !== undefined && { apcLabel: input.apcLabel.trim() }),
    },
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
