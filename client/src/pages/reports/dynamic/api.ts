import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type {
  ReportDefinitionDTO,
  ReportDefinitionSummaryDTO,
  CreateReportDTO,
  UpdateReportDTO,
  ValidateResponseDTO,
  ExecuteResponseDTO,
} from '@shared/dto/DynamicReport';

export function validateSql(sql: string): Promise<ValidateResponseDTO> {
  return apiPost('/api/reports/dynamic/validate', { sql });
}

export function listActiveReports(): Promise<ReportDefinitionSummaryDTO[]> {
  return apiGet('/api/reports/dynamic');
}

export function getAllReports(): Promise<ReportDefinitionSummaryDTO[]> {
  return apiGet('/api/reports/dynamic/all');
}

export function getReport(id: number): Promise<ReportDefinitionDTO> {
  return apiGet(`/api/reports/dynamic/${id}`);
}

export function createReport(data: CreateReportDTO): Promise<ReportDefinitionDTO> {
  return apiPost('/api/reports/dynamic', data);
}

export function updateReport(id: number, data: UpdateReportDTO): Promise<ReportDefinitionDTO> {
  return apiPut(`/api/reports/dynamic/${id}`, data);
}

export function deleteReport(id: number): Promise<void> {
  return apiDelete(`/api/reports/dynamic/${id}`);
}

export function executeReport(
  id: number,
  params: Record<string, string | number | boolean | null>,
  page: number,
  pageSize: number,
): Promise<ExecuteResponseDTO> {
  return apiPost(`/api/reports/dynamic/${id}/execute`, { params, page, pageSize }, false);
}

export function downloadReport(
  id: number,
  params: Record<string, string | number | boolean | null>,
): Promise<ExecuteResponseDTO> {
  return apiPost(`/api/reports/dynamic/${id}/download`, { params }, false);
}

export async function downloadReportCsv(
  id: number,
  params: Record<string, string | number | boolean | null>,
  filename: string,
): Promise<void> {
  const response = await fetch(`/api/reports/dynamic/${id}/download/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ params }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = 'Export failed';
    try {
      const json = JSON.parse(text) as { error?: string };
      message = json.error ?? message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getParamOptions(
  id: number,
  paramName: string,
): Promise<{ value: string; label: string }[]> {
  return apiGet(`/api/reports/dynamic/${id}/options/${paramName}`);
}
