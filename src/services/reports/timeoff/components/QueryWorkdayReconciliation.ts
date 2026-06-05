import { prisma } from '../../../../db/prisma';
import type { WorkdayReconciliationRowDTO } from '@shared/dto/WorkdayReconciliation';

interface RawRow {
  WorkdayId: string | null;
  Name: string | null;
  Email: string | null;
  'Supervisor WorkdayId': string | null;
  'Supervisor Name': string | null;
  Date: string | null;
  'Workday Type': string | null;
  'App Type': string | null;
  'Workday Status': string | null;
  'App Status': string | null;
  'Reconciliation Flag': string | null;
  'Original Dates': string | null;
  Country: string | null;
}

export async function queryWorkdayReconciliation(
  supervisedIds: number[],
): Promise<WorkdayReconciliationRowDTO[]> {
  if (supervisedIds.length === 0) return [];

  const sql = `
    SELECT
      app.tod_wdid::varchar                                       AS "WorkdayId",
      app.tod_names || ' ' || app.tod_surnames                   AS "Name",
      wi.win_corporate_email                                      AS "Email",
      COALESCE(sup_tms.wdid, wd.twd_manager_id)                  AS "Supervisor WorkdayId",
      COALESCE(sup_tms.tms_names || ' ' || sup_tms.tms_surnames,
               wd.twd_manager_name)                              AS "Supervisor Name",
      TO_CHAR(app.tod_day, 'DD-Mon-YYYY')                        AS "Date",
      wd.twd_time_off                                            AS "Workday Type",
      app.tod_type_of_timeoff                                    AS "App Type",
      wd.twd_status                                              AS "Workday Status",
      app.tod_status                                             AS "App Status",
      'App only — missing in Workday'                            AS "Reconciliation Flag",
      tod_original_ranges                                        AS "Original Dates",
      cou.cou_iso                                                AS "Country"

    FROM ds.tod_timeoff_by_day app
    LEFT OUTER JOIN es.tdw_timeoff_wd_v wd
      ON  wd.twd_time_off_date = app.tod_day
      AND wd.twd_employee_id   = app.tod_wdid::varchar
    LEFT JOIN es.win_workday_info wi
      ON  app.tod_wdid::varchar = wi.win_wdid
    LEFT JOIN ds.tbl_team_members tms
      ON  tms.wdid = app.tod_wdid::varchar
    LEFT JOIN ds.tbl_tms_x_supervisor txs
      ON  txs.tms_id     = tms.tms_id
      AND txs.txs_stadat <= CURRENT_DATE
      AND (txs.txs_enddat IS NULL OR txs.txs_enddat >= CURRENT_DATE)
    LEFT JOIN ds.tbl_team_members sup_tms
      ON  sup_tms.tms_id = txs.sup_id
    LEFT JOIN ds.cou_countries cou
      ON  tms.cou_id = cou.cou_id
    WHERE wd.twd_employee_id IS NULL
      AND app.tod_type_of_timeoff = 'Vacation'
      AND app.tod_day BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '45 days'
      AND tms.tms_id = ANY($1::int[])
    ORDER BY
      app.tod_day ASC,
      app.tod_names ASC,
      app.tod_surnames ASC
  `;

  const rows = await prisma.$queryRawUnsafe<RawRow[]>(sql, supervisedIds);

  return rows.map((r): WorkdayReconciliationRowDTO => ({
    workdayId:           r['WorkdayId'],
    name:                r['Name'],
    email:               r['Email'],
    supervisorWorkdayId: r['Supervisor WorkdayId'],
    supervisorName:      r['Supervisor Name'],
    date:                r['Date'],
    workdayType:         r['Workday Type'],
    appType:             r['App Type'],
    workdayStatus:       r['Workday Status'],
    appStatus:           r['App Status'],
    reconciliationFlag:  r['Reconciliation Flag'],
    originalDates:       r['Original Dates'],
    country:             r['Country'],
  }));
}
