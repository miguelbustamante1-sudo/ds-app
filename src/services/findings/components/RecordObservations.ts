import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import type { ObservationRow } from '../types';

/** Stable key ordering so an unchanged payload always hashes identically. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
}

export function computePayloadHash(payload: Record<string, unknown>): string {
  return createHash('md5').update(canonicalize(payload)).digest('hex');
}

export function buildObservations(
  snapshots: Record<string, Record<string, unknown>>,
): ObservationRow[] {
  return Object.entries(snapshots).map(([entityId, payload]) => ({
    entityId,
    payload,
    rowHash: computePayloadHash(payload),
  }));
}

/**
 * Appends an immutable copy of every snapshot row read this run. Unlike
 * snp_entity_snapshot these rows are never overwritten — obs_row_hash lets later
 * work skip payloads that have not changed.
 */
export async function recordObservations(
  entityType: string,
  rows: ObservationRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const created = await prisma.obsObservation.createMany({
    data: rows.map((row) => ({
      entityType,
      entityId: row.entityId,
      payload: row.payload as Prisma.InputJsonValue,
      rowHash: row.rowHash,
      persistenceJobId: null,
    })),
  });

  return created.count;
}
