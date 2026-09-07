import { ConfigurationError } from '../errors/ConfigurationError';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new ConfigurationError(`Missing required environment variable: ${name}`);
  }
  return value;
}
