/** One flattened row returned by the change-log report endpoint. */
export interface TimeOffChangeLogRowDTO {
  // Context columns
  changeDate: string;           // toc_created_at (ISO string)
  changeLogId: number;          // toc_id
  timeOffId: number;            // tto_id
  employeeFullName: string;     // tms_names + ' ' + tms_surnames (or known-as variant)
  employeeKnownAs: string | null;
  countryName: string;
  changedByName: string | null;
  comment: string | null;

  // Original value columns (null when toc_old_values is null — creation event)
  origStartDate: string | null;
  origEndDate: string | null;
  origDays: number | null;
  origCategory: string | null;
  origStatus: string | null;
  origActive: 'Yes' | 'No' | null;

  // New value columns
  newStartDate: string | null;
  newEndDate: string | null;
  newDays: number | null;
  newCategory: string | null;
  newStatus: string | null;
  newActive: 'Yes' | 'No' | null;
}

/** Query params accepted by the report endpoint. */
export interface TimeOffChangeLogQueryDTO {
  dimension?: 'employee' | 'date-range' | 'category' | 'reviewer';
  from?: string;
  to?: string;
  countryIds?: string;      // comma-separated IDs
  teamMemberId?: string;
  categoryIds?: string;     // comma-separated IDs
  changedByUserId?: string;
  statusIds?: string;       // comma-separated IDs
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  export?: string;          // 'true' = skip pagination
}

/** Paginated API response. */
export interface TimeOffChangeLogResponseDTO {
  data: TimeOffChangeLogRowDTO[];
  total: number;
  page: number;
  pageSize: number;
}
