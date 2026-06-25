import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface SopLibraryItem {
  sliId:          number;
  sliName:        string;
  sliGoogleUrl:   string;
  sliCategory:    string | null;
  sliMinTier:     number;
  sliActive:      boolean;
  sliCreatedBy:   number;
  sliCreatedDate: string;
  sliUpdatedBy:   number;
  sliUpdatedDate: string;
}

export interface CreateSopLibraryItemPayload {
  sliName:      string;
  sliGoogleUrl: string;
  sliCategory?: string | null;
  sliMinTier:   number;
}

export interface UpdateSopLibraryItemPayload {
  sliName?:      string;
  sliGoogleUrl?: string;
  sliCategory?:  string | null;
  sliMinTier?:   number;
  sliActive?:    boolean;
}

export const SOP_TIER_LABELS: Record<number, string> = {
  1: 'User',
  2: 'TL Team',
  3: 'LT Team',
  4: 'BSA',
  5: 'Admin',
};

export const SOP_TIER_OPTIONS = [
  { value: 1, label: 'User' },
  { value: 2, label: 'TL Team' },
  { value: 3, label: 'LT Team' },
  { value: 4, label: 'BSA' },
  { value: 5, label: 'Admin' },
];

export async function fetchSopLibraryItems(): Promise<SopLibraryItem[]> {
  return apiGet<SopLibraryItem[]>('/sop-library');
}

export async function fetchAllSopLibraryItems(): Promise<SopLibraryItem[]> {
  return apiGet<SopLibraryItem[]>('/sop-library/all');
}

export async function createSopLibraryItem(
  payload: CreateSopLibraryItemPayload,
): Promise<SopLibraryItem> {
  return apiPost<SopLibraryItem, CreateSopLibraryItemPayload>('/sop-library', payload);
}

export async function updateSopLibraryItem(
  id: number,
  payload: UpdateSopLibraryItemPayload,
): Promise<SopLibraryItem> {
  return apiPut<SopLibraryItem, UpdateSopLibraryItemPayload>(`/sop-library/${id}`, payload);
}

export async function deleteSopLibraryItem(id: number): Promise<void> {
  return apiDelete(`/sop-library/${id}`);
}
