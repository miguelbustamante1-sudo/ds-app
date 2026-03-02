import { prisma } from '../../../db/prisma';
import type { TimeOffActivityLogEntryDTO } from '@shared/dto/TimeOffActivityLog';

interface ActivityLogParams {
  teamMemberIds: number[];
  page:          number;
  pageSize:      number;
}

const SELECT_COLS = `
  toc.toc_id                                                  AS change_log_id,
  toc.tto_id                                                  AS time_off_id,
  TO_CHAR(toc.toc_created_at, 'YYYY-MM-DD')                  AS change_date,
  tm.tms_names || ' ' || tm.tms_surnames                      AS employee_full_name,
  COALESCE(cou.cou_name, '')                                  AS country_name,
  usr.usr_name                                                AS changed_by_name,
  toc.toc_comment                                             AS comment,
  (toc.toc_old_values->>'startDate')                          AS orig_start_date,
  (toc.toc_old_values->>'endDate')                            AS orig_end_date,
  (toc.toc_old_values->>'days')::numeric                      AS orig_days,
  oc.tot_name                                                 AS orig_category,
  os.sta_name                                                 AS orig_status,
  CASE WHEN (toc.toc_old_values->>'active') = 'true'  THEN 'Yes'
       WHEN (toc.toc_old_values->>'active') = 'false' THEN 'No'
       ELSE NULL END                                          AS orig_active,
  (toc.toc_new_values->>'startDate')                          AS new_start_date,
  (toc.toc_new_values->>'endDate')                            AS new_end_date,
  (toc.toc_new_values->>'days')::numeric                      AS new_days,
  nc.tot_name                                                 AS new_category,
  ns.sta_name                                                 AS new_status,
  CASE WHEN (toc.toc_new_values->>'active') = 'true'  THEN 'Yes'
       WHEN (toc.toc_new_values->>'active') = 'false' THEN 'No'
       ELSE NULL END                                          AS new_active,
  cur_cat.tot_name                                            AS current_category,
  TO_CHAR(tto.tto_stadat, 'YYYY-MM-DD')                      AS current_start_date,
  TO_CHAR(tto.tto_enddat, 'YYYY-MM-DD')                      AS current_end_date
`;

const JOINS = `
  FROM ds.toc_timeoff_changelog toc
  INNER JOIN ds.tbl_tms_time_off   tto ON tto.tto_id = toc.tto_id
  INNER JOIN ds.tbl_team_members   tm  ON tm.tms_id  = tto.tms_id
  LEFT  JOIN ds.cou_countries      cou ON cou.cou_id = tm.cou_id
  LEFT  JOIN ds.tbl_users          usr ON usr.usr_id = toc.toc_created_by
  LEFT  JOIN ds.tot_time_off_types oc  ON oc.tot_id  = (toc.toc_old_values->>'categoryId')::int
  LEFT  JOIN ds.tbl_to_statuses    os  ON os.sta_id  = (toc.toc_old_values->>'statusId')::int
  LEFT  JOIN ds.tot_time_off_types nc      ON nc.tot_id  = (toc.toc_new_values->>'categoryId')::int
  LEFT  JOIN ds.tbl_to_statuses    ns      ON ns.sta_id  = (toc.toc_new_values->>'statusId')::int
  LEFT  JOIN ds.tot_time_off_types cur_cat ON cur_cat.tot_id = tto.tot_id
`;

export async function getActivityLog(
  params: ActivityLogParams,
): Promise<{ data: TimeOffActivityLogEntryDTO[]; total: number }> {
  const { teamMemberIds, page, pageSize } = params;
  const offset = page * pageSize;

  const WHERE = `WHERE tto.tms_id = ANY($1::int[])`;

  const countSql = `SELECT COUNT(*)::int AS total ${JOINS} ${WHERE}`;
  const countResult = await prisma.$queryRawUnsafe<{ total: number }[]>(
    countSql,
    teamMemberIds,
  );
  const total = Number(countResult[0]?.total ?? 0);

  const dataSql = `
    SELECT ${SELECT_COLS}
    ${JOINS}
    ${WHERE}
    ORDER BY toc.toc_created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    dataSql,
    teamMemberIds,
    pageSize,
    offset,
  );

  const data: TimeOffActivityLogEntryDTO[] = rows.map((r) => ({
    changeLogId:      Number(r['change_log_id']),
    timeOffId:        Number(r['time_off_id']),
    changeDate:       String(r['change_date'] ?? ''),
    employeeFullName: String(r['employee_full_name']),
    countryName:      String(r['country_name']),
    changedByName:    r['changed_by_name'] != null ? String(r['changed_by_name']) : null,
    comment:          r['comment']          != null ? String(r['comment'])          : null,
    origStatus:       r['orig_status']      != null ? String(r['orig_status'])      : null,
    newStatus:        r['new_status']       != null ? String(r['new_status'])       : null,
    origCategory:     r['orig_category']    != null ? String(r['orig_category'])    : null,
    newCategory:      r['new_category']     != null ? String(r['new_category'])     : null,
    origStartDate:    r['orig_start_date']  != null ? (String(r['orig_start_date']).split('T')[0] ?? null) : null,
    newStartDate:     r['new_start_date']   != null ? (String(r['new_start_date']).split('T')[0]  ?? null) : null,
    origEndDate:      r['orig_end_date']    != null ? (String(r['orig_end_date']).split('T')[0]   ?? null) : null,
    newEndDate:       r['new_end_date']     != null ? (String(r['new_end_date']).split('T')[0]    ?? null) : null,
    origDays:         r['orig_days']        != null ? Number(r['orig_days'])        : null,
    newDays:          r['new_days']         != null ? Number(r['new_days'])         : null,
    origActive:         (r['orig_active'] as 'Yes' | 'No' | null) ?? null,
    newActive:          (r['new_active']  as 'Yes' | 'No' | null) ?? null,
    currentCategory:    r['current_category']   != null ? String(r['current_category'])   : null,
    currentStartDate:   r['current_start_date'] != null ? String(r['current_start_date']) : null,
    currentEndDate:     r['current_end_date']   != null ? String(r['current_end_date'])   : null,
  }));

  return { data, total };
}
