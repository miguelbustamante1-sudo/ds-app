export interface AuditHistoryEntryDTO {
  id: string;
  createdAt: string;
  createdBy: string;
  comment: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}
