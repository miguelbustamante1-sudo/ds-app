import type { ValidateResponseDTO } from '@shared/dto/DynamicReport';

export interface WizardParameter {
  parameterName: string;
  parameterLabel: string;
  parameterType: string;
  parameterRequired: boolean;
  parameterDefault: string | null;
  parameterOrder: number;
  // select-specific
  selectSource?: 'static' | 'query';
  staticOptions?: string;
  queryOptions?: string;
}

export interface WizardState {
  sql: string;
  validationResult: ValidateResponseDTO | null;
  sqlDirtyAfterValidation: boolean;
  parameters: WizardParameter[];
  reportName: string;
  reportDescription: string;
  reportGroup: string;
  reportPermission: string;
  reportActive: boolean;
}
