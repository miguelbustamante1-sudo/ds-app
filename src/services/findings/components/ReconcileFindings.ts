import { createHash } from 'crypto';
import type { FindingInsert, OpenFindingRef, ReconcileAction, WatchedField } from '../types';

function valueToText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function computeFingerprint(
  entityType: string,
  entityId: string,
  fieldPath: string | null,
  newValueText: string | null,
): string {
  const content = [entityType, entityId, fieldPath || '', newValueText || ''].join(':');
  return createHash('md5').update(content).digest('hex');
}

function openKey(entityId: string, fieldPath: string | null): string {
  return `${entityId}\u0000${fieldPath ?? ''}`;
}

export interface ReconcileResult {
  actions: ReconcileAction[];
  entitiesCompared: number;
}

/**
 * Reconciles the current snapshot against the approved baseline once per
 * (entityId, fieldPath), emitting the actions needed to bring open findings in
 * line with reality. Pure — all IO happens in ApplyFindingsPlan.
 */
export function reconcileFindings(
  entityType: string,
  activeFields: WatchedField[],
  snapshots: Record<string, Record<string, unknown>>,
  approvedStates: Record<string, Record<string, unknown>>,
  openFindings: OpenFindingRef[],
): ReconcileResult {
  const openByKey = new Map(openFindings.map((f) => [openKey(f.entityId, f.fieldPath), f]));
  const entityIds = new Set([...Object.keys(snapshots), ...Object.keys(approvedStates)]);
  const actions: ReconcileAction[] = [];

  for (const entityId of entityIds) {
    const snapshot = snapshots[entityId];
    const approved = approvedStates[entityId];

    // A record absent from either side is a failed read, not a revert. It may still
    // surface as added/deleted, but it must never self-resolve an open finding.
    const bothPresent = snapshot !== undefined && approved !== undefined;

    for (const field of activeFields) {
      const currentValue = snapshot?.[field.fieldPath] ?? null;
      const baselineValue = approved?.[field.fieldPath] ?? null;
      const currentText = valueToText(currentValue);
      const baselineText = valueToText(baselineValue);
      const existing = openByKey.get(openKey(entityId, field.fieldPath));

      if (currentText === baselineText) {
        if (bothPresent && existing) {
          actions.push({ kind: 'self_resolve', findingId: existing.findingId });
        }
        continue;
      }

      const insert: FindingInsert = {
        entityId,
        fieldPath: field.fieldPath,
        changeType: baselineText === null ? 'added' : currentText === null ? 'deleted' : 'modified',
        oldValue: baselineValue,
        newValue: currentValue,
        fingerprint: computeFingerprint(entityType, entityId, field.fieldPath, currentText),
      };

      if (!existing) {
        actions.push({ kind: 'open', insert });
      } else if (valueToText(existing.newValue) === currentText) {
        actions.push({ kind: 'recur', findingId: existing.findingId });
      } else {
        actions.push({ kind: 'supersede', findingId: existing.findingId, insert });
      }
    }
  }

  return { actions, entitiesCompared: entityIds.size };
}
