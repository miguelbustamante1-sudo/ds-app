import { Prisma } from '@prisma/client';

interface SubmittedValue {
  wiiId: string;
  value: unknown;
}

interface ValidationError {
  wiiId: string;
  label: string;
  message: string;
}

interface ValidationResult {
  valid: true;
}

interface ValidationFailure {
  valid: false;
  errors: ValidationError[];
}

type ValidateTaskInputsResult = ValidationResult | ValidationFailure;

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function validateByDataType(
  dataType: string,
  value: unknown,
  optionSetJson: Prisma.JsonValue | null,
): string | null {
  switch (dataType) {
    case 'TEXT':
      if (typeof value !== 'string' || value.trim().length === 0) {
        return 'Must be a non-empty string';
      }
      return null;

    case 'NUMBER': {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (typeof num !== 'number' || !isFinite(num)) {
        return 'Must be a valid finite number';
      }
      return null;
    }

    case 'BOOLEAN':
      if (typeof value !== 'boolean') {
        return 'Must be a boolean';
      }
      return null;

    case 'DATE': {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return 'Must be a valid date string';
      }
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        return 'Must be a valid date string';
      }
      return null;
    }

    case 'DATETIME': {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return 'Must be a valid datetime string';
      }
      const dt = new Date(value);
      if (isNaN(dt.getTime())) {
        return 'Must be a valid datetime string';
      }
      return null;
    }

    case 'SELECT': {
      if (optionSetJson === null || !Array.isArray(optionSetJson)) {
        return null; // No option set defined — skip validation
      }
      const options = optionSetJson as Array<{ value: string }>;
      const validValues = options.map((o) => o.value);
      if (!validValues.includes(value as string)) {
        return `Must be one of: ${validValues.join(', ')}`;
      }
      return null;
    }

    default:
      return null;
  }
}

export async function validateTaskInputs(
  witId: string,
  tx: Prisma.TransactionClient,
  submittedValues: SubmittedValue[],
): Promise<ValidateTaskInputsResult> {
  const inputs = await tx.wiiWorkflowInstanceTaskInput.findMany({
    where: { witId },
  });

  const submittedMap = new Map<string, unknown>(
    submittedValues.map((sv) => [sv.wiiId, sv.value]),
  );

  const errors: ValidationError[] = [];

  for (const input of inputs) {
    const submitted = submittedMap.get(input.wiiId);
    const hasValue = isNonEmpty(submitted);

    if (input.isRequired && !hasValue) {
      errors.push({
        wiiId: input.wiiId,
        label: input.label,
        message: `${input.label} is required`,
      });
      continue;
    }

    if (!hasValue) continue;

    const typeError = validateByDataType(
      input.dataType,
      submitted,
      input.optionSetJson ?? null,
    );
    if (typeError) {
      errors.push({
        wiiId: input.wiiId,
        label: input.label,
        message: typeError,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
