import { prisma } from '../../../db/prisma';
import { mapConnectionToDto } from './mapConnectionToDto';
import { MondayConnectionNotFoundError } from '../errors';
import type { MondayConnectionDTO } from '@shared/dto';

export async function deleteConnection(mcdId: number): Promise<MondayConnectionDTO> {
  const existing = await prisma.mondayConnection.findUnique({ where: { mcdId } });
  if (!existing) throw new MondayConnectionNotFoundError();

  const dto = mapConnectionToDto(existing);
  await prisma.mondayConnection.delete({ where: { mcdId } });
  return dto;
}
