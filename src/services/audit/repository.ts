import { prisma } from '../../db/prisma';
import { Prisma, type Audit } from '@prisma/client';

export interface CreateAuditInput {
  entityName: string;
  entityId: string;
  createdBy: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  comment?: string | null;
}

export async function createAudit(input: CreateAuditInput) {
  return prisma.audit.create({
    data: {
      entityName: input.entityName,
      entityId: input.entityId,
      createdBy: input.createdBy,
      oldValues: input.oldValues != null ? (input.oldValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      newValues: input.newValues != null ? (input.newValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      comment: input.comment ?? null,
    },
  });
}

export async function getByEntity(entityName: string, entityId: string): Promise<Audit[]> {
  return prisma.audit.findMany({
    where: { entityName, entityId },
    orderBy: { createdAt: 'desc' },
  });
}
