// ─── Report Parameter ─────────────────────────────────────────────────────────

export interface ReportParameterDTO {
  parameterId: number;
  reportId: number;
  parameterName: string;
  parameterLabel: string;
  parameterType: string;
  parameterRequired: boolean;
  parameterDefault: string | null;
  parameterOrder: number;
  parameterOptions: string | null;
}

// ─── Select Options (stored as JSON in parameterOptions) ──────────────────────

export type SelectOptions =
  | { source: 'static'; options: { value: string; label: string }[] }
  | { source: 'query'; query: string };

// ─── Report Definition (full, with parameters) ────────────────────────────────

export interface ReportDefinitionDTO {
  reportId: number;
  reportName: string;
  reportDescription: string | null;
  reportGroup: string;
  reportSqlQuery: string;
  reportActive: boolean;
  reportPermission: string | null;
  reportCreatedAt: Date;
  reportCreatedBy: string;
  reportUpdatedAt: Date | null;
  reportUpdatedBy: string | null;
  parameters: ReportParameterDTO[];
}

// ─── Report Definition Summary (lightweight, for list views) ──────────────────

export interface ReportDefinitionSummaryDTO {
  reportId: number;
  reportName: string;
  reportDescription: string | null;
  reportGroup: string;
  reportActive: boolean;
  reportPermission: string | null;
}

// ─── Wizard Save Payloads ─────────────────────────────────────────────────────

export interface CreateReportDTO {
  reportName: string;
  reportDescription?: string | null;
  reportGroup: string;
  reportSqlQuery: string;
  reportActive: boolean;
  reportPermission?: string | null;
  parameters: Omit<ReportParameterDTO, 'parameterId' | 'reportId'>[];
}

export type UpdateReportDTO = CreateReportDTO;

// ─── Validate ─────────────────────────────────────────────────────────────────

export interface ValidateRequestDTO {
  sql: string;
}

export interface ValidateResponseDTO {
  valid: boolean;
  columns: string[];
  parameters: string[];
  error?: string;
}

// ─── Execute ──────────────────────────────────────────────────────────────────

export interface ExecuteRequestDTO {
  params: Record<string, string | number | boolean | null>;
  page?: number;
  pageSize?: number;
}

export interface ExecuteResponseDTO {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}
