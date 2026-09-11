import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { ApiPermissionCatalogDTO, CreatePermissionCatalogEntryDTO } from '@shared/dto';

export async function createPermissionCatalogEntry(
  input: CreatePermissionCatalogEntryDTO,
  createdBy: number,
): Promise<ApiPermissionCatalogDTO> {
  if (!input.apcResource?.trim()) {
    throw new AppError('Resource is required', 400);
  }
  if (!input.apcLabel?.trim()) {
    throw new AppError('Label is required', 400);
  }

  const created = await prisma.apiPermissionCatalog.create({
    data: {
      apcResource: input.apcResource.trim(),
      apcAction: input.apcAction,
      apcLabel: input.apcLabel.trim(),
      apcIsActive: true,
      apcCreatedBy: createdBy,
    },
  });

  return {
    apcId: created.apcId,
    apcResource: created.apcResource,
    apcAction: created.apcAction as 'read' | 'create' | 'delete',
    apcLabel: created.apcLabel,
    apcIsActive: created.apcIsActive,
  };
}
