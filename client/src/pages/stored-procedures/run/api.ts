import { apiGet, apiPost } from '@/lib/api';
import type { StoredProcedureSummaryDTO, ProcedureSignatureDTO, ExecuteStoredProcedureResponseDTO } from '@shared/dto/StoredProcedure';

export async function listActiveProcedures(): Promise<StoredProcedureSummaryDTO[]> {
  return apiGet<StoredProcedureSummaryDTO[]>('/api/stored-procedures');
}

export async function getProcedureSignature(spId: number): Promise<ProcedureSignatureDTO> {
  return apiGet<ProcedureSignatureDTO>(`/api/stored-procedures/${spId}/signature`);
}

export async function executeProcedure(
  spId: number,
  params: Record<string, string | number | boolean | null>,
): Promise<ExecuteStoredProcedureResponseDTO> {
  return apiPost<ExecuteStoredProcedureResponseDTO, { params: Record<string, string | number | boolean | null> }>(
    `/api/stored-procedures/${spId}/execute`,
    { params },
  );
}
