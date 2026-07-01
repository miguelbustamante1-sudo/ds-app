// Response DTOs (read)
export interface StoredProcedureDTO {
  spId: number;
  spSchema: string;          // 'ds' or 'es'
  spName: string;
  spLabel: string;
  spDescription: string | null;
  spActive: boolean;
  spCreatedAt: string;       // ISO date string
  spCreatedBy: number;
  spUpdatedAt: string | null;
  spUpdatedBy: number | null;
}

export interface StoredProcedureSummaryDTO {
  spId: number;
  spLabel: string;
  spDescription: string | null;
  spActive: boolean;
}

// Input DTOs (create/update)
export interface CreateStoredProcedureDTO {
  spSchema: string;
  spName: string;
  spLabel: string;
  spDescription?: string | null;
}

export interface UpdateStoredProcedureDTO {
  spLabel?: string;
  spDescription?: string | null;
  spActive?: boolean;
}

// Parameter signature (returned from catalog introspection)
export interface ProcedureParameterSignatureDTO {
  parameterName: string;
  pgType: string;            // e.g. 'integer', 'text', 'boolean', 'timestamp with time zone'
  mode: 'in' | 'out' | 'inout';
}

export interface ProcedureSignatureDTO {
  kind: 'procedure' | 'function';
  parameters: ProcedureParameterSignatureDTO[];
}

// Execution request/response
export interface ExecuteStoredProcedureDTO {
  params: Record<string, string | number | boolean | null>;
}

export interface ExecuteStoredProcedureResponseDTO {
  success: boolean;
  message: string;
}
