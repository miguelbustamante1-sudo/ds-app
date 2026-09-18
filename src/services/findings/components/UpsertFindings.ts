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
        ${diff.oldValue},
        ${diff.newValue},
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

    if (rows.length > 0) {
      results.push({
        findingId: rows[0].fnd_id,
        fingerprint: rows[0].fnd_fingerprint,
        inserted: rows[0].xmax === 0,
      });
    }
  }

  return results;
}
