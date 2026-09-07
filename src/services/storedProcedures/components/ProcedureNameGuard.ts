import { AppError } from '../../../errors/AppError';

/**
 * Validates schema and procedure names before use in SQL.
 * Postgres cannot parameterize identifiers, so this provides defense-in-depth.
 */
export class ProcedureNameGuard {
  /**
   * Validates that schema is 'ds' or 'es' and name is a valid Postgres identifier.
   * Throws AppError if validation fails.
   */
  static validate(schema: string, name: string): void {
    // Only allow ds and es
    if (!['ds', 'es'].includes(schema)) {
      throw new AppError('Schema must be ds or es', 400);
    }

    // Identifier pattern: [a-zA-Z_][a-zA-Z0-9_]*
    const identifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!identifierPattern.test(name)) {
      throw new AppError(
        `Invalid procedure name: must start with letter or underscore, contain only alphanumeric and underscores`,
        400,
      );
    }
  }
}
