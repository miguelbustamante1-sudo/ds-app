import { prisma } from '../../../db/prisma';
import type { DiffRow } from '../types';

export interface UpsertFindingsResult {
  findingId: number;
  fingerprint: string;
  inserted: boolean;
}

export async function upsertFindings(
  entityType: string,
  diffs: DiffRow[],
): Promise<UpsertFindingsResult[]> {
  if (diffs.length === 0) {
    return [];
  }

  const results: UpsertFindingsResult[] = [];

  for (const diff of diffs) {
    // Convert values to JSON strings for JSONB storage
    const oldValueJson = diff.oldValue === null ? null : JSON.stringify(diff.oldValue);
    const newValueJson = diff.newValue === null ? null : JSON.stringify(diff.newValue);

    const rows = await prisma.$queryRaw<Array<{ fnd_id: number; fnd_fingerprint: string; xmax: number }>>`
      INSERT INTO ds.fnd_findings (
        fnd_fingerprint,
        cde_entity_type,
        fnd_entity_id,
        cdf_field_path,
        change_type,
        old_value,
        new_value,
        severity,
        status,
        first_seen,
        last_seen,
        occurrence_count
      )
      VALUES (
        ${diff.fingerprint},
        ${entityType},
        ${diff.entityId},
        ${diff.fieldPath},
        ${diff.changeType},
        ${oldValueJson}::jsonb,
        ${newValueJson}::jsonb,
        'medium',
        'open',
        NOW(),
        NOW(),
        1
      )
      ON CONFLICT (fnd_fingerprint) WHERE status = 'open'
      DO UPDATE SET
        last_seen = NOW(),
        occurrence_count = ds.fnd_findings.occurrence_count + 1
      RETURNING fnd_id, fnd_fingerprint, (xmax = 0)::int as xmax
    `;

    const row = rows[0];
    if (row) {
      results.push({
        findingId: row.fnd_id,
        fingerprint: row.fnd_fingerprint,
        inserted: row.xmax === 0,
      });
    }
  }

  return results;
}
