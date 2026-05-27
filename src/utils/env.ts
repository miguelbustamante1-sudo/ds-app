/**
 * Environment variable utilities
 * Use requireEnv anywhere you need a guaranteed, non-empty value from
 * process.env. It throws a clear configuration error at call time so
 * missing variables are caught on startup rather than at runtime.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
