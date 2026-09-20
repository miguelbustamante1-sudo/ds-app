// client/src/lib/changelog/deriveActionBadge.ts

export type ChangeLogAction = 'Created' | 'Updated' | 'Cancelled' | 'Approved' | 'Rejected';

export interface ActionBadgeInput {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  activeKey?: string;
  statusKey?: string;
  approvedStatusIds?: number[];
  rejectedStatusIds?: number[];
}

/**
 * Derives a display action (Created/Updated/Cancelled/Approved/Rejected) purely from
 * the before/after snapshots — never from comment text, since comment wording is free
 * text and not a stable contract.
 */
export function deriveActionBadge(input: ActionBadgeInput): ChangeLogAction {
  const { oldValues, newValues, activeKey, statusKey, approvedStatusIds, rejectedStatusIds } = input;

  if (oldValues === null) return 'Created';
  if (!newValues) return 'Updated';

  if (activeKey) {
    const wasActive = Boolean(oldValues[activeKey]);
    const isActive = Boolean(newValues[activeKey]);
    if (wasActive && !isActive) return 'Cancelled';
  }

  if (statusKey) {
    const oldStatus = oldValues[statusKey];
    const newStatus = newValues[statusKey];
    if (oldStatus !== newStatus) {
      const newStatusId = Number(newStatus);
      if (approvedStatusIds?.includes(newStatusId)) return 'Approved';
      if (rejectedStatusIds?.includes(newStatusId)) return 'Rejected';
    }
  }

  return 'Updated';
}
