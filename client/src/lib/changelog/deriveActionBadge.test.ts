// client/src/lib/changelog/deriveActionBadge.test.ts
import { describe, it, expect } from 'vitest';
import { deriveActionBadge } from './deriveActionBadge';

describe('deriveActionBadge', () => {
  it('returns Created when oldValues is null', () => {
    expect(deriveActionBadge({ oldValues: null, newValues: { sta_id: 1 } })).toBe('Created');
  });

  it('returns Cancelled when the active flag flips from truthy to falsy', () => {
    const action = deriveActionBadge({
      oldValues: { tto_active: 1, sta_id: 2 },
      newValues: { tto_active: 0, sta_id: 4 },
      activeKey: 'tto_active',
    });
    expect(action).toBe('Cancelled');
  });

  it('returns Cancelled for a boolean active flag too (holiday swaps use booleans)', () => {
    const action = deriveActionBadge({
      oldValues: { active: true },
      newValues: { active: false },
      activeKey: 'active',
    });
    expect(action).toBe('Cancelled');
  });

  it('returns Approved when statusId transitions to an approved status id', () => {
    const action = deriveActionBadge({
      oldValues: { sta_id: 1 },
      newValues: { sta_id: 2 },
      statusKey: 'sta_id',
      approvedStatusIds: [2],
      rejectedStatusIds: [5],
    });
    expect(action).toBe('Approved');
  });

  it('returns Rejected when statusId transitions to a rejected status id', () => {
    const action = deriveActionBadge({
      oldValues: { sta_id: 1 },
      newValues: { sta_id: 5 },
      statusKey: 'sta_id',
      approvedStatusIds: [2],
      rejectedStatusIds: [5],
    });
    expect(action).toBe('Rejected');
  });

  it('falls back to Updated when nothing else matches', () => {
    const action = deriveActionBadge({
      oldValues: { tto_stadat: '2026-01-01' },
      newValues: { tto_stadat: '2026-01-02' },
    });
    expect(action).toBe('Updated');
  });

  it('returns Updated (not Created) when newValues is null but oldValues is present', () => {
    expect(deriveActionBadge({ oldValues: { sta_id: 1 }, newValues: null })).toBe('Updated');
  });
});
