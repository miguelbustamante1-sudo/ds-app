import type { TimeOffActivityLogEntryDTO } from '@shared/dto/TimeOffActivityLog';

export type ChangeType = 'created' | 'approved' | 'declined' | 'cancelled' | 'dates-changed' | 'modified';

export function classifyChange(entry: TimeOffActivityLogEntryDTO): ChangeType {
  if (!entry.origStatus && entry.newStatus)                                    return 'created';
  if (entry.origActive === 'Yes' && entry.newActive === 'No')                  return 'cancelled';
  if (entry.newStatus === 'Approved' || entry.newStatus === 'Acknowledged')    return 'approved';
  if (entry.newStatus === 'Rejected')                                          return 'declined';
  if (entry.origStartDate !== entry.newStartDate || entry.origEndDate !== entry.newEndDate) return 'dates-changed';
  return 'modified';
}
