import { prisma } from '../../../db/prisma';
import { encryptSecret } from '../lib/secretCipher';
import { mapConnectionToDto } from './mapConnectionToDto';
import { MondayValidationError } from '../errors';
import type { CreateMondayConnectionDTO, MondayConnectionDTO } from '@shared/dto';

export async function createConnection(
  input: CreateMondayConnectionDTO,
  createdBy: number,
): Promise<MondayConnectionDTO> {
  if (!input.mcdName?.trim()) throw new MondayValidationError('Connection name is required');
  if (!input.mcdApiKey?.trim()) throw new MondayValidationError('Monday API key is required');
  if (!input.mcdBoardId?.trim()) throw new MondayValidationError('Board is required');

  const created = await prisma.mondayConnection.create({
    data: {
      mcdName: input.mcdName.trim(),
      mcdApiKeyEncrypted: encryptSecret(input.mcdApiKey.trim()),
      mcdBoardId: input.mcdBoardId.trim(),
      mcdBoardName: input.mcdBoardName ?? null,
      mcdFieldMapping: {},
      mcdCreatedBy: createdBy,
    },
  });

  return mapConnectionToDto(created);
}
