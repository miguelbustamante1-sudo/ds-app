export type MondaySyncStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

// assigneeColumnId is optional at the TYPE level because a freshly created connection has an
// empty mapping (`{}`) until the admin fills in the Field Mapping popup — it is NOT optional at
// the business level. UpdateConnection and SyncConnection both validate at runtime that it's
// present before allowing a sync-relevant save / before running a sync.
export interface MondayFieldMapping {
  descriptionColumnId?: string | null;
  priorityColumnId?: string | null;
  priorityValueMap?: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>;
  dueDateColumnId?: string | null;
  assigneeColumnId?: string;
  statusColumnId?: string | null;
  statusValueMap?: Record<string, 'PENDING' | 'APPROVED' | 'REJECTED'>;
}

export interface MondaySyncFailure {
  mondayItemId: string;
  itemName: string;
  reason: string;
}

export interface MondaySyncSummary {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: MondaySyncFailure[];
}

export interface MondayConnectionDTO {
  mcdId: number;
  mcdName: string;
  mcdApiKeyMasked: string;
  mcdBoardId: string;
  mcdBoardName: string | null;
  mcdFieldMapping: MondayFieldMapping;
  mcdIsActive: boolean;
  mcdLastSyncedDate: string | null;
  mcdLastSyncStatus: MondaySyncStatus | null;
  mcdLastSyncSummary: MondaySyncSummary | null;
  createdBy: number;
  createdDate: string;
  updatedBy: number | null;
  updatedDate: string | null;
}

export interface CreateMondayConnectionDTO {
  mcdName: string;
  mcdApiKey: string;
  mcdBoardId: string;
  mcdBoardName?: string | null;
}

export interface UpdateMondayConnectionDTO {
  mcdName?: string;
  mcdApiKey?: string;
  mcdBoardId?: string;
  mcdBoardName?: string | null;
  mcdFieldMapping?: MondayFieldMapping;
  mcdIsActive?: boolean;
}

export interface TestMondayConnectionDTO {
  mcdApiKey: string;
}

export interface TestMondayConnectionResponseDTO {
  success: boolean;
  accountName?: string;
  error?: string;
}

export interface MondayBoardColumnDTO {
  columnId: string;
  columnTitle: string;
  columnType: string;
  options?: string[];
}

export interface MondaySyncResultDTO {
  connection: MondayConnectionDTO;
  summary: MondaySyncSummary;
}

// Both dates are YYYY-MM-DD, inclusive, matching Monday's "between" operator day granularity.
// Omit both to use the default range (today - 7 days through today).
export interface SyncMondayConnectionDTO {
  sinceDate?: string;
  untilDate?: string;
}
