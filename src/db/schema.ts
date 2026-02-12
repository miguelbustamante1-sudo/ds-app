import { pool } from './pool';

export type TableCheck = {
  table: string;
  presentColumns: string[];
  missingColumns: string[];
  extraColumns: string[];
};

export type SchemaCheckResult = {
  ok: boolean;
  details: TableCheck[];
  error?: string;
  lastChecked?: string;
};

// Expected columns for tables the app depends on. Keep this minimal — list only columns used by the code.
const EXPECTED: Record<string, string[]> = {
  'ds.tbl_countries': ['cou_id', 'reg_id', 'cou_name'],
  'ds.tbl_regions': ['reg_id', 'reg_name'],
  'ds.tbl_to_categories': ['cat_id', 'cat_name'],
  'ds.tbl_to_categories_x_country': ['cxc_id', 'cat_id', 'cou_id', 'cxc_status', 'cxc_is_calendar'],
  'ds.tbl_team_members': [
    'tms_id',
    'tms_primary_role',
    'tms_created_by',
    'tms_credat',
    'tms_last_updated_by',
    'tms_last_upddat',
    'tms_stadat',
    'tms_enddat',
    'cou_id',
    'tms_supervisor_id',
    'tms_names',
    'tms_surnames',
    'tms_known_as',
    'tms_seniority',
    'wdid',
  ],
  'ds.tbl_tm_x_projects': [
    'txp_id',
    'tms_id',
    'pro_id',
    'txp_stadat',
    'txp_enddat',
    'rol_id',
    'txp_bill_rate',
    'txp_br_curcod',
    'txp_created_by',
    'txp_credat',
    'txp_last_updated_by',
    'txp_last_upddat',
  ],
  'ds.tbl_projects': ['pro_id', 'pro_name', 'pro_external_id', 'pro_sow'],
  'ds.tbl_roles': ['rol_id', 'rol_name', 'rol_description'],
  'ds.tbl_tm_time_off': [
    'tto_id',
    'tms_id',
    'tto_stadat',
    'tto_enddat',
    'tto_created_by',
    'tto_credat',
    'tto_last_updated_ny',
    'tto_last_upddat',
    'cat_id',
  ],
  'ds.tbl_users': ['usr_id', 'usr_name', 'usr_email', 'usr_role', 'usr_stadat', 'usr_enddat'],
};

async function fetchColumns(schema: string, table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2;`,
    [schema, table]
  );

  return res.rows.map((r) => r.column_name);
}

export async function checkTable(tableFullName: string, expectedColumns: string[]): Promise<TableCheck> {
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

export async function checkAllSchemas(): Promise<SchemaCheckResult> {
  try {
    const checks = await Promise.all(
      Object.entries(EXPECTED).map(([table, cols]) => checkTable(table, cols))
    );
    const ok = checks.every((c) => c.missingColumns.length === 0);
    return { ok, details: checks, lastChecked: new Date().toISOString() };
  } catch (e) {
    return { ok: false, details: [], error: e instanceof Error ? e.message : String(e), lastChecked: new Date().toISOString() };
  }
}

export default { checkAllSchemas, checkTable, EXPECTED };
