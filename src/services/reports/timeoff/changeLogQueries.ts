import { Sql } from '@prisma/client/runtime/library';
import { prisma } from '../../../db/prisma';
import type {
  TimeOffChangeLogQueryDTO,
  TimeOffChangeLogRowDTO,
} from '@shared/dto/TimeOffChangeLog';

// ─── Raw DB row ───────────────────────────────────────────────────────────────

interface RawChangeLogRow {
  change_log_id: number;
  time_off_id: number;
  change_date: Date | null;
  employee_full_name: string;
  employee_known_as: string | null;
  country_name: string;
  changed_by_name: string | null;
  comment: string | null;
  orig_start_date: Date | null;
  orig_end_date: Date | null;
  orig_days: number | null;
  orig_category: string | null;
  orig_status: string | null;
  orig_active: string | null;
  new_start_date: Date | null;
  new_end_date: Date | null;
  new_days: number | null;
  new_category: string | null;
  new_status: string | null;
  new_active: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a nullable Date to ISO date string or null. */
function toISODate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
}

/** Parse comma-separated numeric string into number array (empty → null). */
function parseIds(raw: string | undefined): number[] | null {
  if (!raw) return null;
  const ids = raw.split(',').map(Number).filter((n) => !Number.isNaN(n));
  return ids.length ? ids : null;
}

/**
 * Build the FROM + JOIN block shared by both the count and data queries.
 * Returns a raw SQL fragment as a string (interpolated safely via Prisma $queryRawUnsafe).
 */
function buildJoins(): string {
  return `
    FROM ds.toc_timeoff_changelog toc
    INNER JOIN ds.tbl_tms_time_off     tto ON tto.tto_id  = toc.tto_id
    INNER JOIN ds.tbl_team_members     tm  ON tm.tms_id   = tto.tms_id
    LEFT  JOIN ds.cou_countries        cou ON cou.cou_id  = tm.cou_id
    LEFT  JOIN ds.tbl_users            usr ON usr.usr_id  = toc.toc_created_by
    -- Resolve old category / status names from JSON
    LEFT  JOIN ds.tbl_to_categories    oc  ON oc.cat_id   = (toc.toc_old_values->>'categoryId')::int
    LEFT  JOIN ds.tbl_to_statuses      os  ON os.sta_id   = (toc.toc_old_values->>'statusId')::int
    -- Resolve new category / status names from JSON
    LEFT  JOIN ds.tbl_to_categories    nc  ON nc.cat_id   = (toc.toc_new_values->>'categoryId')::int
    LEFT  JOIN ds.tbl_to_statuses      ns  ON ns.sta_id   = (toc.toc_new_values->>'statusId')::int
  `;
}

interface WhereResult {
  clause: string;
  values: unknown[];
}

/**
 * Build the parameterized WHERE clause.
 * Returns the SQL fragment with $N placeholders and the corresponding values array.
 */
function buildWhereClause(params: TimeOffChangeLogQueryDTO): WhereResult {
  const conditions: string[] = ['1=1'];
  const values: unknown[] = [];
  let idx = 1;

  if (params.from) {
    conditions.push(`toc.toc_created_at >= $${idx++}::date`);
    values.push(params.from);
  }
  if (params.to) {
    conditions.push(`toc.toc_created_at <= $${idx++}::date`);
    values.push(params.to);
  }

  const countryIds = parseIds(params.countryIds);
  if (countryIds) {
    conditions.push(`tm.cou_id = ANY($${idx++}::int[])`);
    values.push(countryIds);
  }

  if (params.teamMemberId) {
    const tmId = Number(params.teamMemberId);
    if (!Number.isNaN(tmId)) {
      conditions.push(`tto.tms_id = $${idx++}`);
      values.push(tmId);
    }
  }

  const categoryIds = parseIds(params.categoryIds);
  if (categoryIds) {
    conditions.push(`tto.cat_id = ANY($${idx++}::int[])`);
    values.push(categoryIds);
  }

  if (params.changedByUserId) {
    const userId = Number(params.changedByUserId);
    if (!Number.isNaN(userId)) {
      conditions.push(`toc.toc_created_by = $${idx++}`);
      values.push(userId);
    }
  }

  const statusIds = parseIds(params.statusIds);
  if (statusIds) {
    conditions.push(`tto.sta_id = ANY($${idx++}::int[])`);
    values.push(statusIds);
  }

  return { clause: conditions.join(' AND '), values };
}

/** Whitelist of sortable columns to prevent SQL injection. */
const SORTABLE_COLUMNS: Record<string, string> = {
  changeDate:       'toc.toc_created_at',
  changeLogId:      'toc.toc_id',
  timeOffId:        'toc.tto_id',
  employeeFullName: 'employee_full_name',
  countryName:      'cou.cou_name',
  origCategory:     'oc.cat_name',
  origStatus:       'os.sta_name',
  newCategory:      'nc.cat_name',
  newStatus:        'ns.sta_name',
};

const EXPORT_ROW_CAP = 50_000;

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getTimeOffChangeLog(
  params: TimeOffChangeLogQueryDTO,
): Promise<{ rows: TimeOffChangeLogRowDTO[]; total: number; capped: boolean }> {
  const { clause: whereClause, values: whereValues } = buildWhereClause(params);
  const joins = buildJoins();

  // Sort
  const sortCol = (params.sortBy && SORTABLE_COLUMNS[params.sortBy])
    ? SORTABLE_COLUMNS[params.sortBy]
    : 'toc.toc_created_at';
  const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';

  const isExport = params.export === 'true';
  const page = Math.max(0, Number(params.page ?? 0));
  const pageSize = Math.min(500, Math.max(1, Number(params.pageSize ?? 25)));
  const offset = page * pageSize;

  // ── SELECT columns ──────────────────────────────────────────────────────────
  const selectCols = `
    toc.toc_id                                               AS change_log_id,
    toc.tto_id                                               AS time_off_id,
    toc.toc_created_at                                       AS change_date,
    CASE
      WHEN tm.tms_known_as IS NOT NULL
        THEN tm.tms_known_as || ' ' || tm.tms_surnames
      ELSE tm.tms_names || ' ' || tm.tms_surnames
    END                                                      AS employee_full_name,
    tm.tms_known_as                                          AS employee_known_as,
    COALESCE(cou.cou_name, '')                               AS country_name,
    usr.usr_name                                             AS changed_by_name,
    toc.toc_comment                                          AS comment,
    -- Original values (null when toc_old_values is null)
    (toc.toc_old_values->>'startDate')                       AS orig_start_date,
    (toc.toc_old_values->>'endDate')                         AS orig_end_date,
    (toc.toc_old_values->>'days')::numeric                   AS orig_days,
    oc.cat_name                                              AS orig_category,
    os.sta_name                                              AS orig_status,
    CASE
      WHEN (toc.toc_old_values->>'active') = 'true'  THEN 'Yes'
      WHEN (toc.toc_old_values->>'active') = 'false' THEN 'No'
      ELSE NULL
    END                                                      AS orig_active,
    -- New values
    (toc.toc_new_values->>'startDate')                       AS new_start_date,
    (toc.toc_new_values->>'endDate')                         AS new_end_date,
    (toc.toc_new_values->>'days')::numeric                   AS new_days,
    nc.cat_name                                              AS new_category,
    ns.sta_name                                              AS new_status,
    CASE
      WHEN (toc.toc_new_values->>'active') = 'true'  THEN 'Yes'
      WHEN (toc.toc_new_values->>'active') = 'false' THEN 'No'
      ELSE NULL
    END                                                      AS new_active
  `;

  // ── Count query ─────────────────────────────────────────────────────────────
  const countSql = `SELECT COUNT(*)::int AS total ${joins} WHERE ${whereClause}`;
  const countResult = await prisma.$queryRawUnsafe<{ total: number }[]>(
    countSql,
    ...whereValues,
  );
  const total = Number(countResult[0]?.total ?? 0);

  // ── Data query ──────────────────────────────────────────────────────────────
  let dataSql = `SELECT ${selectCols} ${joins} WHERE ${whereClause} ORDER BY ${sortCol} ${sortDir}`;

  if (isExport) {
    dataSql += ` LIMIT ${EXPORT_ROW_CAP}`;
  } else {
    // Clone values to add pagination params at the end
    const paginationOffset = whereValues.length + 1;
    dataSql += ` LIMIT $${paginationOffset} OFFSET $${paginationOffset + 1}`;
    whereValues.push(pageSize, offset);
  }

  const rows = await prisma.$queryRawUnsafe<RawChangeLogRow[]>(dataSql, ...whereValues);

  const capped = isExport && total > EXPORT_ROW_CAP;

  const mapped: TimeOffChangeLogRowDTO[] = rows.map((r) => ({
    changeDate:       toISODate(r.change_date) ?? '',
    changeLogId:      Number(r.change_log_id),
    timeOffId:        Number(r.time_off_id),
    employeeFullName: r.employee_full_name,
    employeeKnownAs:  r.employee_known_as,
    countryName:      r.country_name,
    changedByName:    r.changed_by_name,
    comment:          r.comment,
    origStartDate:    r.orig_start_date ? String(r.orig_start_date).split('T')[0] : null,
    origEndDate:      r.orig_end_date   ? String(r.orig_end_date).split('T')[0]   : null,
    origDays:         r.orig_days != null ? Number(r.orig_days) : null,
    origCategory:     r.orig_category,
    origStatus:       r.orig_status,
    origActive:       (r.orig_active as 'Yes' | 'No' | null) ?? null,
    newStartDate:     r.new_start_date  ? String(r.new_start_date).split('T')[0]  : null,
    newEndDate:       r.new_end_date    ? String(r.new_end_date).split('T')[0]    : null,
    newDays:          r.new_days  != null ? Number(r.new_days)  : null,
    newCategory:      r.new_category,
    newStatus:        r.new_status,
    newActive:        (r.new_active  as 'Yes' | 'No' | null) ?? null,
  }));

  return { rows: mapped, total, capped };
}
