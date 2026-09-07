import { prisma } from './prisma';
import type { ClientContact } from '@prisma/client';
import type { ClientContactDTO } from '@shared/dto';

export const TABLE = 'ds.cco_client_contact';

export async function getAllClientContacts(clientId?: number): Promise<ClientContactDTO[]> {
  const contacts = await prisma.clientContact.findMany({
    ...(clientId !== undefined && { where: { clientId } }),
    orderBy: { id: 'asc' },
    include: { client: true },
  });

  return contacts.map((c) => ({
    id: c.id,
    clientId: c.clientId,
    name: c.name,
    email: c.email,
    phoneNumber: c.phoneNumber,
    position: c.position,
    active: c.active,
    clientName: c.client.Name,
  }));
}

export async function getClientContactById(id: number): Promise<ClientContactDTO | null> {
  const c = await prisma.clientContact.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!c) return null;

  return {
    id: c.id,
    clientId: c.clientId,
    name: c.name,
    email: c.email,
    phoneNumber: c.phoneNumber,
    position: c.position,
    active: c.active,
    clientName: c.client.Name,
  };
}

export async function getClientContactRaw(id: number): Promise<ClientContact | null> {
  return prisma.clientContact.findUnique({ where: { id } });
}

export async function createClientContact(data: {
  clientId: number;
  name: string;
  email: string;
  phoneNumber: string;
  position?: string | null;
}): Promise<ClientContact> {
  return prisma.clientContact.create({ data });
}

export async function updateClientContact(
  id: number,
  data: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    position?: string | null;
    active?: boolean;
  },
): Promise<ClientContact> {
  return prisma.clientContact.update({ where: { id }, data });
}

export async function deleteClientContact(id: number): Promise<void> {
  await prisma.clientContact.delete({ where: { id } });
}
