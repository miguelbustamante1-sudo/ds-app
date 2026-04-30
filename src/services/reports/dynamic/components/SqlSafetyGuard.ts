import pool from '../../../../db/pool';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCKED_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'GRANT',
  'REVOKE',
  'EXECUTE',
  'CALL',
];

const PARAM_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripComments(sql: string): string {
  // Remove /* */ block comments
  let stripped = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove -- line comments
  stripped = stripped.replace(/--[^\r\n]*/g, '');
  return stripped;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns an ordered list of placeholder names found in the SQL template.
 * Preserves order of first appearance.
 */
export function extractParams(sql: string): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(PARAM_PATTERN.source, 'g');

  while ((match = re.exec(sql)) !== null) {
    const name = match[1]!;
    if (!seen.has(name)) {
      seen.add(name);
      ordered.push(name);
    }
  }

  return ordered;
}

/**
 * Validates that the SQL is a safe SELECT-only statement.
 * Throws a descriptive Error on any violation.
 * Pure string analysis — does not execute any DB query.
 */
export function assertSqlSafe(sql: string): void {
  const stripped = stripComments(sql).trim();

  // Rule 1: Must start with SELECT or WITH (CTE)
  if (!/^(SELECT|WITH)\b/i.test(stripped)) {
    throw new Error('SQL must begin with a SELECT or WITH statement.');
  }

  // Rule 2: No blocked DML/DDL keywords
  const upperSql = stripped.toUpperCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    // Match as whole word to avoid false positives (e.g. "EXECUTION" matching EXECUTE)
    const wordBoundary = new RegExp(`\\b${keyword}\\b`);
    if (wordBoundary.test(upperSql)) {
      throw new Error(`SQL contains forbidden keyword: ${keyword}`);
    }
  }

  // Rule 3: No multiple statements — semicolon only allowed as final character
  const withoutTrailingSemicolon = stripped.replace(/;$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    throw new Error('SQL must contain only a single statement. Multiple statements are not allowed.');
  }
}

/**
 * Executes a dry-run of the SQL template with all placeholders replaced by
 * NULL::text and a LIMIT 0 wrapper to extract column names without returning data.
 */
export async function getColumnsFromSql(sql: string): Promise<string[]> {
  assertSqlSafe(sql);

  const stripped = stripComments(sql).trim();
  const sanitized = stripped.replace(PARAM_PATTERN, 'NULL::text');
  const wrapped = `SELECT * FROM (${sanitized}) AS __validate_result__ LIMIT 0`;

  const result = await pool.query(wrapped);
  return result.fields.map((f: { name: string }) => f.name);
}
