import { prisma } from '../../../db/prisma';
import { encryptSecret } from '../lib/secretCipher';
import { mapConnectionToDto } from './mapConnectionToDto';
import { MondayConnectionNotFoundError, MondayValidationError } from '../errors';
import type { UpdateMondayConnectionDTO, MondayConnectionDTO, MondayFieldMapping } from '@shared/dto';
import type { Prisma } from '@prisma/client';

export async function updateConnection(
  mcdId: number,
  input: UpdateMondayConnectionDTO,
  updatedBy: number,
): Promise<MondayConnectionDTO> {
  const existing = await prisma.mondayConnection.findUnique({ where: { mcdId } });
  if (!existing) throw new MondayConnectionNotFoundError();

  const data: Prisma.MondayConnectionUncheckedUpdateInput = {};

  if (input.mcdName !== undefined) {
    if (!input.mcdName.trim()) throw new MondayValidationError('Connection name is required');
    data.mcdName = input.mcdName.trim();
  }
  if (input.mcdApiKey !== undefined && input.mcdApiKey.trim() !== '') {
    data.mcdApiKeyEncrypted = encryptSecret(input.mcdApiKey.trim());
  }
  if (input.mcdBoardId !== undefined) data.mcdBoardId = input.mcdBoardId.trim();
  if (input.mcdBoardName !== undefined) data.mcdBoardName = input.mcdBoardName;
  if (input.mcdFieldMapping !== undefined) {
    data.mcdFieldMapping = input.mcdFieldMapping as unknown as Prisma.InputJsonValue;
  }

  const nextIsActive = input.mcdIsActive ?? existing.mcdIsActive;
  const nextMapping: MondayFieldMapping =
    input.mcdFieldMapping ?? (existing.mcdFieldMapping as MondayFieldMapping);
  if (nextIsActive && !nextMapping.assigneeColumnId) {
    throw new MondayValidationError(
      'An assignee column must be mapped before this connection can be made active.',
    );
  }
  if (input.mcdIsActive !== undefined) data.mcdIsActive = input.mcdIsActive;

  data.mcdUpdatedBy = updatedBy;
  data.mcdUpdatedDate = new Date();

  const updated = await prisma.mondayConnection.update({ where: { mcdId }, data });
  return mapConnectionToDto(updated);
}
