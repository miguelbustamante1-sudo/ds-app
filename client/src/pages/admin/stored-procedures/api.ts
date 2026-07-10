import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type {
  StoredProcedureDTO,
  CreateStoredProcedureDTO,
  UpdateStoredProcedureDTO,
} from '@shared/dto/StoredProcedure';

export async function listAllProcedures(): Promise<StoredProcedureDTO[]> {
  return apiGet<StoredProcedureDTO[]>('/api/stored-procedures/admin');
}

export async function registerProcedure(data: CreateStoredProcedureDTO): Promise<StoredProcedureDTO> {
  return apiPost<StoredProcedureDTO, CreateStoredProcedureDTO>('/api/stored-procedures/admin', data);
}

export async function updateProcedure(
  spId: number,
  data: UpdateStoredProcedureDTO,
): Promise<StoredProcedureDTO> {
  return apiPut<StoredProcedureDTO, UpdateStoredProcedureDTO>(`/api/stored-procedures/admin/${spId}`, data);
}

export async function deactivateProcedure(spId: number): Promise<void> {
  return apiDelete(`/api/stored-procedures/admin/${spId}`);
}
