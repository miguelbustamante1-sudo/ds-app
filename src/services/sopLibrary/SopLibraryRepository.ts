import prisma from '../../db/prisma';
import type { SopLibraryItemDto, CreateSopLibraryItemInput, UpdateSopLibraryItemInput } from './types';

function mapRow(row: {
  sliId: number;
  sliName: string;
  sliGoogleUrl: string;
  sliCategory: string | null;
  sliMinTier: number;
  sliActive: boolean;
  sliCreatedBy: number;
  sliCreatedDate: Date;
  sliUpdatedBy: number;
  sliUpdatedDate: Date;
}): SopLibraryItemDto {
  return {
    sliId:          row.sliId,
    sliName:        row.sliName,
    sliGoogleUrl:   row.sliGoogleUrl,
    sliCategory:    row.sliCategory,
    sliMinTier:     row.sliMinTier,
    sliActive:      row.sliActive,
    sliCreatedBy:   row.sliCreatedBy,
    sliCreatedDate: row.sliCreatedDate,
    sliUpdatedBy:   row.sliUpdatedBy,
    sliUpdatedDate: row.sliUpdatedDate,
  };
}

export async function listByTier(maxTier: number): Promise<SopLibraryItemDto[]> {
  const rows = await prisma.sopLibraryItem.findMany({
    where: { sliActive: true, sliMinTier: { lte: maxTier } },
    orderBy: [{ sliCategory: 'asc' }, { sliName: 'asc' }],
  });
  return rows.map(mapRow);
}

export async function listAll(): Promise<SopLibraryItemDto[]> {
  const rows = await prisma.sopLibraryItem.findMany({
    orderBy: [{ sliCategory: 'asc' }, { sliName: 'asc' }],
  });
  return rows.map(mapRow);
}

export async function getById(id: number): Promise<SopLibraryItemDto | null> {
  const row = await prisma.sopLibraryItem.findUnique({ where: { sliId: id } });
  return row ? mapRow(row) : null;
}

export async function create(
  data: CreateSopLibraryItemInput,
  createdBy: number,
): Promise<SopLibraryItemDto> {
  const row = await prisma.sopLibraryItem.create({
    data: {
      sliName:      data.sliName,
      sliGoogleUrl: data.sliGoogleUrl,
      sliCategory:  data.sliCategory ?? null,
      sliMinTier:   data.sliMinTier,
      sliCreatedBy: createdBy,
      sliUpdatedBy: createdBy,
    },
  });
  return mapRow(row);
}

export async function update(
  id: number,
  data: UpdateSopLibraryItemInput,
  updatedBy: number,
): Promise<SopLibraryItemDto | null> {
  const existing = await getById(id);
  if (!existing) return null;

  const row = await prisma.sopLibraryItem.update({
    where: { sliId: id },
    data: {
      ...(data.sliName      !== undefined && { sliName:      data.sliName }),
      ...(data.sliGoogleUrl !== undefined && { sliGoogleUrl: data.sliGoogleUrl }),
      ...(data.sliCategory  !== undefined && { sliCategory:  data.sliCategory }),
      ...(data.sliMinTier   !== undefined && { sliMinTier:   data.sliMinTier }),
      ...(data.sliActive    !== undefined && { sliActive:    data.sliActive }),
      sliUpdatedBy: updatedBy,
    },
  });
  return mapRow(row);
}

export async function softDelete(
  id: number,
  updatedBy: number,
): Promise<SopLibraryItemDto | null> {
  const existing = await getById(id);
  if (!existing) return null;

  const row = await prisma.sopLibraryItem.update({
    where: { sliId: id },
    data: { sliActive: false, sliUpdatedBy: updatedBy },
  });
  return mapRow(row);
}
