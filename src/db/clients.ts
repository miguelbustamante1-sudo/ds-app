import { prisma } from './prisma';
import type { Client } from '@prisma/client';

export const TABLE = 'ds.cli_clients';

export async function getAllClients(): Promise<Client[]> {
  return await prisma.client.findMany({
    orderBy: { Id: 'asc' },
  });
}

export async function getClientById(id: number): Promise<Client | null> {
  return await prisma.client.findUnique({
    where: { Id: id },
  });
}

export async function createClient(name: string): Promise<Client> {
  return await prisma.client.create({
    data: {
      Name: name,
    },
  });
}

export async function updateClient(id: number, name: string): Promise<Client | null> {
  return await prisma.client.update({
    where: { Id: id },
    data: {
      Name: name,
    },
  });
}

export async function deleteClient(id: number): Promise<void> {
  await prisma.client.delete({
    where: { Id: id },
  });
}
