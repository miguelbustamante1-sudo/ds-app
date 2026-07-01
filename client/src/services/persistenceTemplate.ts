import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type {
  PersistenceTemplateDTO,
  CreatePersistenceTemplateInput,
  UpdatePersistenceTemplateInput,
} from '@shared/dto/PersistenceTemplate';
import type { PersistenceTable } from '@shared/dto/PersistenceTable';

const BASE = '/api/persistence-template';
const TABLE_BASE = '/api/persistence-table';

// --- Persistence Templates ----------------------------------------------------

/**
 * Fetches ALL persistence templates by iterating pages of 50 until exhausted.
 * The endpoint defaults to a 10-item page when no page/limit is passed, so
 * callers must paginate through it explicitly to see the full list.
 */
export async function getPersistenceTemplates(): Promise<PersistenceTemplateDTO[]> {
  const LIMIT = 50;
  const all: PersistenceTemplateDTO[] = [];
  let page = 1;

  while (true) {
    const batch = await apiGet<PersistenceTemplateDTO[]>(`${BASE}?page=${page}&limit=${LIMIT}`);
    all.push(...batch);
    if (batch.length < LIMIT) break;
    page += 1;
  }

  return all;
}

export const getPersistenceTemplate = (id: number) =>
  apiGet<PersistenceTemplateDTO>(`${BASE}/${id}`);

export const createPersistenceTemplate = (payload: CreatePersistenceTemplateInput) =>
  apiPost<PersistenceTemplateDTO, CreatePersistenceTemplateInput>(BASE, payload);

export const updatePersistenceTemplate = (id: number, payload: UpdatePersistenceTemplateInput) =>
  apiPut<PersistenceTemplateDTO, UpdatePersistenceTemplateInput>(`${BASE}/${id}`, payload);

export const deletePersistenceTemplate = (id: number) =>
  apiDelete(`${BASE}/${id}`);

// --- Persistence Tables (for target-table dropdown) ---------------------------

interface PersistenceTablePage {
  data: PersistenceTable[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Fetches ALL persistence tables by iterating pages of 50 until exhausted.
 * Falls back gracefully: if the API returns a plain array instead of a page
 * envelope, we treat it as the full list.
 */
export async function getAllPersistenceTables(): Promise<PersistenceTable[]> {
  const LIMIT = 50;
  const all: PersistenceTable[] = [];
  let page = 1;

  while (true) {
    const raw = await apiGet<PersistenceTablePage | PersistenceTable[]>(
      `${TABLE_BASE}?page=${page}&limit=${LIMIT}`,
      false,
    );

    // Plain array response (no pagination envelope)
    if (Array.isArray(raw)) {
      all.push(...raw);
      break;
    }

    // Paginated envelope response
    all.push(...raw.data);

    const fetched = page * LIMIT;
    if (fetched >= raw.total || raw.data.length < LIMIT) {
      break;
    }
    page += 1;
  }

  return all;
}
