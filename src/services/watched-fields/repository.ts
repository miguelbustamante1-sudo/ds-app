import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type {
  CreateWatchedEntityDto,
  CreateWatchedFieldDto,
  UpdateWatchedFieldDto,
  WatchedEntityDto,
  WatchedFieldDto,
} from '@shared/dto';

type EntityRow = Prisma.CdeWatchedEntityGetPayload<object>;
type FieldRow = Prisma.CdfWatchedFieldGetPayload<object>;

function toEntityDto(row: EntityRow, activeFieldCount: number): WatchedEntityDto {
  return {
    entityType: row.entityType,
    label: row.label,
    ownerEmail: row.ownerEmail,
    completenessPct: row.completenessPct === null ? null : Number(row.completenessPct),
    active: row.active,
    seededAt: row.seededAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    activeFieldCount,
  };
}

function toFieldDto(row: FieldRow): WatchedFieldDto {
  return {
    fieldId: row.fieldId,
    entityType: row.entityType,
    fieldPath: row.fieldPath,
    displayName: row.displayName,
    dataType: row.dataType as WatchedFieldDto['dataType'],
    comparisonMode: row.comparisonMode as WatchedFieldDto['comparisonMode'],
    tolerance: row.tolerance === null ? null : Number(row.tolerance),
    nullEqualsEmpty: row.nullEqualsEmpty,
    significance: row.significance as WatchedFieldDto['significance'],
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export async function listEntities(): Promise<WatchedEntityDto[]> {
  const [rows, counts] = await Promise.all([
    prisma.cdeWatchedEntity.findMany({ orderBy: { entityType: 'asc' } }),
    prisma.cdfWatchedField.groupBy({ by: ['entityType'], where: { active: true }, _count: { _all: true } }),
  ]);

  const countByEntity = new Map(counts.map((c) => [c.entityType, c._count._all]));
  return rows.map((row) => toEntityDto(row, countByEntity.get(row.entityType) ?? 0));
}

export async function getEntity(entityType: string): Promise<WatchedEntityDto | null> {
  const row = await prisma.cdeWatchedEntity.findUnique({ where: { entityType } });
  if (!row) return null;

  const activeFieldCount = await prisma.cdfWatchedField.count({ where: { entityType, active: true } });
  return toEntityDto(row, activeFieldCount);
}

export async function createEntity(data: CreateWatchedEntityDto, actor: string): Promise<WatchedEntityDto> {
  const row = await prisma.cdeWatchedEntity.create({
    data: {
      entityType: data.entityType,
      label: data.label,
      ownerEmail: data.ownerEmail ?? null,
      createdBy: actor,
    },
  });
  return toEntityDto(row, 0);
}

export async function setEntityActive(
  entityType: string,
  active: boolean,
  actor: string,
): Promise<WatchedEntityDto> {
  const row = await prisma.cdeWatchedEntity.update({
    where: { entityType },
    data: { active, updatedBy: actor, updatedAt: new Date() },
  });
  const activeFieldCount = await prisma.cdfWatchedField.count({ where: { entityType, active: true } });
  return toEntityDto(row, activeFieldCount);
}

export async function listFields(entityType: string): Promise<WatchedFieldDto[]> {
  const rows = await prisma.cdfWatchedField.findMany({
    where: { entityType },
    orderBy: { fieldId: 'asc' },
  });
  return rows.map(toFieldDto);
}

export async function getField(fieldId: number): Promise<WatchedFieldDto | null> {
  const row = await prisma.cdfWatchedField.findUnique({ where: { fieldId } });
  return row ? toFieldDto(row) : null;
}

export async function findFieldByPath(entityType: string, fieldPath: string): Promise<WatchedFieldDto | null> {
  const row = await prisma.cdfWatchedField.findUnique({
    where: { entityType_fieldPath: { entityType, fieldPath } },
  });
  return row ? toFieldDto(row) : null;
}

export async function createField(data: CreateWatchedFieldDto, actor: string): Promise<WatchedFieldDto> {
  const row = await prisma.cdfWatchedField.create({
    data: {
      entityType: data.entityType,
      fieldPath: data.fieldPath,
      displayName: data.displayName,
      dataType: data.dataType,
      comparisonMode: data.comparisonMode,
      tolerance: data.tolerance ?? null,
      nullEqualsEmpty: data.nullEqualsEmpty,
      significance: data.significance,
      effectiveFrom: new Date(data.effectiveFrom),
      active: data.active,
      createdBy: actor,
    },
  });
  return toFieldDto(row);
}

export async function updateField(
  fieldId: number,
  data: UpdateWatchedFieldDto,
  actor: string,
): Promise<WatchedFieldDto> {
  const row = await prisma.cdfWatchedField.update({
    where: { fieldId },
    data: {
      displayName: data.displayName,
      dataType: data.dataType,
      comparisonMode: data.comparisonMode,
      tolerance: data.tolerance ?? null,
      nullEqualsEmpty: data.nullEqualsEmpty,
      significance: data.significance,
      effectiveFrom: new Date(data.effectiveFrom),
      active: data.active,
      updatedBy: actor,
      updatedAt: new Date(),
    },
  });
  return toFieldDto(row);
}
