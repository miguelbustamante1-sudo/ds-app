import type { CreateEndorsementDTO } from '@shared/dto';

export interface ValidationError {
  field: string;
  message: string;
}

const REQUIRED_FIELDS: { key: keyof CreateEndorsementDTO; label: string }[] = [
  { key: 'candidateFirstName', label: 'Candidate First Name' },
  { key: 'candidateLastName', label: 'Candidate Last Name' },
  { key: 'posId', label: 'Position' },
  { key: 'projectId', label: 'Project' },
  { key: 'clientManagerEmail', label: 'Client Manager Email' },
  { key: 'countryId', label: 'Country' },
  { key: 'startDate', label: 'Start Date' },
];

export function validateRequiredFields(data: CreateEndorsementDTO): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const { key, label } of REQUIRED_FIELDS) {
    const value = data[key];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      errors.push({ field: key, message: `${label} is required` });
    }
  }

  return errors;
}
