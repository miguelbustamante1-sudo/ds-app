// client/src/lib/changelog/buildFieldDiff.test.ts
import { describe, it, expect } from 'vitest';
import { buildFieldDiff, type FieldMapEntry } from './buildFieldDiff';

const fieldMap: FieldMapEntry[] = [
  { key: 'tto_stadat', label: 'Start Date' },
  { key: 'tto_enddat', label: 'End Date' },
  { key: 'sta_id', label: 'Status', formatter: (v) => `status-${String(v)}` },
];

describe('buildFieldDiff', () => {
  it('returns one line per field where old !== new', () => {
    const oldValues = { tto_stadat: '2026-01-12', tto_enddat: '2026-01-14', sta_id: 1 };
    const newValues = { tto_stadat: '2026-01-15', tto_enddat: '2026-01-14', sta_id: 2 };
    const lines = buildFieldDiff(oldValues, newValues, fieldMap);
    expect(lines).toEqual([
      { label: 'Start Date', oldDisplay: '2026-01-12', newDisplay: '2026-01-15' },
      { label: 'Status', oldDisplay: 'status-1', newDisplay: 'status-2' },
    ]);
  });

  it('omits unchanged fields entirely', () => {
    const oldValues = { tto_stadat: '2026-01-12' };
    const newValues = { tto_stadat: '2026-01-12' };
    const lines = buildFieldDiff(oldValues, newValues, [fieldMap[0] as FieldMapEntry]);
    expect(lines).toEqual([]);
  });

  it('treats a null oldValues as Created: emits new-only lines for present fields', () => {
    const newValues = { tto_stadat: '2026-01-12', sta_id: 1 };
    const lines = buildFieldDiff(null, newValues, fieldMap);
    expect(lines).toEqual([
      { label: 'Start Date', oldDisplay: '', newDisplay: '2026-01-12' },
      { label: 'Status', oldDisplay: '', newDisplay: 'status-1' },
    ]);
  });

  it('returns an empty array when newValues is null', () => {
    expect(buildFieldDiff(null, null, fieldMap)).toEqual([]);
  });

  it('displays an em dash for missing values instead of "undefined"', () => {
    const oldValues = { tto_stadat: '2026-01-12' };
    const newValues = { tto_stadat: null };
    const lines = buildFieldDiff(oldValues, newValues, [fieldMap[0] as FieldMapEntry]);
    expect(lines).toEqual([{ label: 'Start Date', oldDisplay: '2026-01-12', newDisplay: '—' }]);
  });
});
