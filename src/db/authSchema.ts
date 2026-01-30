import { TableCheck, SchemaCheckResult } from './schema';
import { pool } from './pool';

/**
 * Authentication Database Schema Verification
 * 
 * This module checks for the presence of OneLogin authentication tables.
 * It does NOT create or modify tables - schema changes must be handled outside the backend
 * (e.g., via database admin tools or migration management systems).
 * 
 * The backend only verifies expected tables and columns exist.
 */

// Expected columns for OneLogin authentication tables
const EXPECTED_AUTH_TABLES: Record<string, string[]> = {
  'sec.auth_users': [
    'id',
    'onelogin_id',
    'email',
    'first_name',
    'last_name',
    'avatar_url',
    'roles',
    'created_at',
    'updated_at',
    'last_login',
  ],
  'sec.revoked_tokens': [
    'id',
    'token_jti',
    'user_id',
    'revoked_at',
    'expires_at',
  ],
};

async function fetchColumns(schema: string, table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2;`,
    [schema, table]
  );

  return res.rows.map((r) => r.column_name);
}

export async function checkAuthTable(tableFullName: string, expectedColumns: string[]): Promise<TableCheck> {
  const [schema, table] = tableFullName.split('.');
  const present = await fetchColumns(schema!, table!);
  const presentSet = new Set(present);
  const expectedSet = new Set(expectedColumns);

  const missingColumns = expectedColumns.filter((c) => !presentSet.has(c));
  const extraColumns = present.filter((c) => !expectedSet.has(c));

  return {
    table: tableFullName,
    presentColumns: present,
    missingColumns,
    extraColumns,
  };
}

export async function checkAuthSchemas(): Promise<SchemaCheckResult> {
  try {
    const checks = await Promise.all(
      Object.entries(EXPECTED_AUTH_TABLES).map(([table, cols]) => checkAuthTable(table, cols))
    );

    const allOk = checks.every((c) => c.missingColumns.length === 0);

    return {
      ok: allOk,
      details: checks,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      details: [],
      error: error instanceof Error ? error.message : 'Unknown error checking auth schemas',
    };
  }
}
