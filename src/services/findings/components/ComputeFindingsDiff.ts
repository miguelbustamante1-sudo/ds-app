import { createHash } from 'crypto';
import type { DiffRow, WatchedField } from '../types';

function valueToText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function computeFingerprint(entityType: string, entityId: string, fieldPath: string | null, newValueText: string | null): string {
  const parts = [entityType, entityId, fieldPath || '', newValueText || ''];
  const content = parts.join(':');
  return createHash('md5').update(content).digest('hex');
}

export function computeFindingsDiff(
  entityType: string,
  activeFields: WatchedField[],
  snapshotsMap: Record<string, Record<string, any>>,
  approvedStatesMap: Record<string, Record<string, any>>,
): DiffRow[] {
  const diffs: DiffRow[] = [];
  const allEntityIds = new Set<string>();

  Object.keys(snapshotsMap).forEach((id) => allEntityIds.add(id));
  Object.keys(approvedStatesMap).forEach((id) => allEntityIds.add(id));

  for (const entityId of Array.from(allEntityIds)) {
    const snapshot = snapshotsMap[entityId] || {};
    const approvedState = approvedStatesMap[entityId] || {};

    for (const field of activeFields) {
      const currentValue = snapshot[field.fieldPath];
      const approvedValue = approvedState[field.fieldPath];

      const currentValueText = valueToText(currentValue);
      const approvedValueText = valueToText(approvedValue);

      let changeType: 'added' | 'deleted' | 'modified' | null = null;
      let oldValue: unknown = approvedValue;
      let newValue: unknown = currentValue;

      if (approvedValueText === null && currentValueText !== null) {
        changeType = 'added';
      } else if (approvedValueText !== null && currentValueText === null) {
        changeType = 'deleted';
      } else if (approvedValueText !== currentValueText) {
        changeType = 'modified';
      }

      if (changeType) {
        const fingerprint = computeFingerprint(entityType, entityId, field.fieldPath, currentValueText);
        diffs.push({
          entityId,
          fieldPath: field.fieldPath,
          changeType,
          oldValue,
          newValue,
          fingerprint,
        });
      }
    }
  }

  return diffs;
}
