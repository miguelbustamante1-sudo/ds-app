import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { ApiKeyDTO, IssueApiKeyDTO, IssueApiKeyResponseDTO, ApiPermissionCatalogDTO } from '@shared/dto';

export async function fetchApiKeys(): Promise<ApiKeyDTO[]> {
  return apiGet<ApiKeyDTO[]>('/api/admin/api-keys');
}

export async function fetchPermissionCatalog(): Promise<ApiPermissionCatalogDTO[]> {
  return apiGet<ApiPermissionCatalogDTO[]>('/api/admin/api-keys/permission-catalog');
}

export async function issueApiKey(body: IssueApiKeyDTO): Promise<IssueApiKeyResponseDTO> {
  return apiPost<IssueApiKeyResponseDTO, IssueApiKeyDTO>('/api/admin/api-keys', body);
}

export async function revokeApiKey(apkId: number): Promise<ApiKeyDTO> {
  return apiPatch<ApiKeyDTO>(`/api/admin/api-keys/${apkId}/revoke`, {});
}

export async function deleteApiKey(apkId: number): Promise<void> {
  return apiDelete(`/api/admin/api-keys/${apkId}`);
}
