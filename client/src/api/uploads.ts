import { ApiError } from '@/lib/api';
import type { UploadDTO } from '@shared/dto/Upload';

export type { UploadDTO };

export async function uploadFile(file: File): Promise<UploadDTO> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/uploads', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new ApiError(
      (errorData as { error?: string }).error ?? `HTTP ${response.status}`,
      response.status,
      '/api/uploads'
    );
  }

  const json: unknown = await response.json();
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return (json as { data: UploadDTO }).data;
  }
  return json as UploadDTO;
}
