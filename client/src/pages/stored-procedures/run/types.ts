import type { ProcedureSignatureDTO } from '@shared/dto/StoredProcedure';

export interface RunWizardState {
  step: 1 | 2 | 3;
  selectedProcedureId: number | null;
  signature: ProcedureSignatureDTO | null;
  parameters: Record<string, string | number | boolean | null>;
  executing: boolean;
  executionResult: { success: boolean; message: string } | null;
}

export interface WizardFormData {
  [paramName: string]: string | number | boolean | null;
}
