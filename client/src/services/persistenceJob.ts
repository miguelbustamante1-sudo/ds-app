import { apiGet, apiPost } from '@/lib/api';
import type { PersistenceJobRecord, PersistenceJobCancelDTO } from '@shared/dto/PersistenceJob';

export type { PersistenceJobRecord };

const BASE = '/api/persistence-job';

// --- API functions ------------------------------------------------------------

/** Fetch all persistence jobs ordered by most recent first. */
export const getPersistenceJobs = () =>
  apiGet<PersistenceJobRecord[]>(BASE);

/** Fetch a single persistence job by id. */
export const getPersistenceJob = (id: number) =>
  apiGet<PersistenceJobRecord>(`${BASE}/${id}`);

/** Create a new persistence job (multipart/form-data). */
export async function createPersistenceJob(
  persistenceTemplateId: number,
  file: File,
): Promise<PersistenceJobRecord> {
  const form = new FormData();
  form.append('persistenceTemplateId', String(persistenceTemplateId));
  form.append('file', file);

  const response = await fetch(`${BASE}/`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { endpoint: `${BASE}/` } }));
    }
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<PersistenceJobRecord>;
}

/** Cancel a persistence job. */
export const cancelPersistenceJob = (id: number) =>
  apiPost<PersistenceJobCancelDTO, Record<string, never>>(`${BASE}/cancel/${id}`, {});
