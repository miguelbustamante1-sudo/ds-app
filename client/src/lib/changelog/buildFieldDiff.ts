// client/src/lib/changelog/buildFieldDiff.ts

export interface FieldMapEntry {
  key: string;
  label: string;
  formatter?: (value: unknown) => string;
}

export interface FieldDiffLine {
  label: string;
  oldDisplay: string;
  newDisplay: string;
}

function formatValue(value: unknown, formatter?: (value: unknown) => string): string {
  if (value === undefined || value === null) return '—';
  return formatter ? formatter(value) : String(value);
}

/**
 * Computes the changed-field lines between two snapshots for a curated field map.
 * When `oldValues` is null (a Created entry), every present field in `newValues`
 * is emitted as a new-only line (`oldDisplay: ''`) rather than diffed.
 */
export function buildFieldDiff(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  fieldMap: FieldMapEntry[],
): FieldDiffLine[] {
  if (!newValues) return [];

  const isCreated = oldValues === null;
  const lines: FieldDiffLine[] = [];

  for (const field of fieldMap) {
    const newRaw = newValues[field.key];

    if (isCreated) {
      if (newRaw === undefined || newRaw === null) continue;
      lines.push({ label: field.label, oldDisplay: '', newDisplay: formatValue(newRaw, field.formatter) });
      continue;
    }

    const oldRaw = (oldValues as Record<string, unknown>)[field.key];
    const oldDisplay = formatValue(oldRaw, field.formatter);
    const newDisplay = formatValue(newRaw, field.formatter);
    if (oldDisplay !== newDisplay) {
      lines.push({ label: field.label, oldDisplay, newDisplay });
    }
  }

  return lines;
}
