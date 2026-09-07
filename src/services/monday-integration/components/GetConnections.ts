import { prisma } from '../../../db/prisma';
import { mapConnectionToDto } from './mapConnectionToDto';
import { MondayConnectionNotFoundError } from '../errors';
import type { MondayConnectionDTO } from '@shared/dto';

export async function getConnections(): Promise<MondayConnectionDTO[]> {
  const rows = await prisma.mondayConnection.findMany({ orderBy: { mcdName: 'asc' } });
  return rows.map(mapConnectionToDto);
}

export async function getConnectionById(mcdId: number): Promise<MondayConnectionDTO> {
  const row = await prisma.mondayConnection.findUnique({ where: { mcdId } });
  if (!row) throw new MondayConnectionNotFoundError();
  return mapConnectionToDto(row);
}
