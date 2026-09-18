export const WATCHED_FIELD_DATA_TYPES = [
  'text',
  'number',
  'boolean',
  'date',
  'datetime',
  'picklist',
] as const;
export type WatchedFieldDataType = (typeof WATCHED_FIELD_DATA_TYPES)[number];

export const WATCHED_FIELD_COMPARISON_MODES = [
  'exact',
  'case_insensitive',
  'numeric_tolerance',
  'date_only',
] as const;
export type WatchedFieldComparisonMode = (typeof WATCHED_FIELD_COMPARISON_MODES)[number];

export const WATCHED_FIELD_SIGNIFICANCES = ['material', 'informational'] as const;
export type WatchedFieldSignificance = (typeof WATCHED_FIELD_SIGNIFICANCES)[number];

export interface WatchedEntityDto {
  entityType: string;
  label: string;
  ownerEmail: string | null;
  completenessPct: number | null;
  active: boolean;
  seededAt: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  activeFieldCount: number;
}

export interface CreateWatchedEntityDto {
  entityType: string;
  label: string;
  ownerEmail?: string | null;
}

/** Entities are create-or-toggle only: the PK is immutable and 7 tables FK it with onDelete: Restrict. */
export interface SetWatchedEntityActiveDto {
  active: boolean;
}

export interface WatchedFieldDto {
  fieldId: number;
  entityType: string;
  fieldPath: string;
  displayName: string;
  dataType: WatchedFieldDataType;
  comparisonMode: WatchedFieldComparisonMode;
  tolerance: number | null;
  nullEqualsEmpty: boolean;
  significance: WatchedFieldSignificance;
  effectiveFrom: string;
  active: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface CreateWatchedFieldDto {
  entityType: string;
  fieldPath: string;
  displayName: string;
  dataType: WatchedFieldDataType;
  comparisonMode: WatchedFieldComparisonMode;
  tolerance?: number | null;
  nullEqualsEmpty: boolean;
  significance: WatchedFieldSignificance;
  effectiveFrom: string;
  active: boolean;
}

/** fieldPath is create-only: findings and observations reference it by string match. */
export type UpdateWatchedFieldDto = Omit<CreateWatchedFieldDto, 'entityType' | 'fieldPath'>;
