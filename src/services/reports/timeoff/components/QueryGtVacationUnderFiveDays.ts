import { prisma } from '../../../../db/prisma';
import type { GtVacationUnderFiveDaysRowDTO } from '@shared/dto/GtVacationUnderFiveDays';

interface RawRow {
  corporate_email: string | null;
  billing_status: string | null;
  workday_id: string | null;
  gender: string | null;
  cost_center_hierarchy: string | null;
  cost_center_names: string | null;
  name: string | null;
  start_date: string | null;
  country: string | null;
  position: string | null;
  timeoff_start_date: string | null;
  timeoff_end_date: string | null;
  days: number | null;
  type_of_timeoff: string | null;
  status: string | null;
}

export async function queryGtVacationUnderFiveDays(
  supervisedIds: number[],
): Promise<GtVacationUnderFiveDaysRowDTO[]> {
  if (supervisedIds.length === 0) return [];

  const sql = `
    SELECT
      wd.win_corporate_email                          AS corporate_email,
      wd.win_billing_status                           AS billing_status,
      wd.win_wdid                                     AS workday_id,
      wd.win_gender                                   AS gender,
      wd.win_cost_center_hierarchy                    AS cost_center_hierarchy,
      wd.win_cost_center_names                        AS cost_center_names,
      tm.tms_names || ' ' || tm.tms_surnames          AS name,
      TO_CHAR(tm.tms_stadat, 'DD-Mon-YYYY')           AS start_date,
      c.cou_name                                      AS country,
      r.pos_name                                      AS position,
      TO_CHAR(t.tto_stadat, 'DD-Mon-YYYY')            AS timeoff_start_date,
      TO_CHAR(t.tto_enddat, 'DD-Mon-YYYY')            AS timeoff_end_date,
      t.tto_days                                      AS days,
      tot.tot_name                                    AS type_of_timeoff,
      sta.sta_name                                    AS status
    FROM ds.tbl_team_members tm
    JOIN es.win_workday_info wd  ON tm.wdid = wd.win_wdid
    JOIN ds.cou_countries c      ON tm.cou_id = c.cou_id
    JOIN ds.pos_positions r      ON tm.tms_primary_role = r.pos_id
    JOIN ds.tbl_tms_time_off t   ON tm.tms_id = t.tms_id
    JOIN ds.tot_time_off_types tot ON t.tot_id = tot.tot_id
    JOIN ds.tbl_to_statuses sta  ON sta.sta_id = t.sta_id
    WHERE (tm.tms_enddat IS NULL OR tm.tms_enddat > CURRENT_DATE)
      AND t.tto_active = 1
      AND tot.tot_id = 14
      AND tm.cou_id = 2
      AND t.tto_days < 5
      AND t.tto_enddat >= CURRENT_DATE
      AND t.tto_stadat <= '2050-12-01'
      AND t.sta_id NOT IN (4, 5, 6)
      AND tm.tms_id = ANY($1::int[])
    ORDER BY t.tto_stadat ASC, tm.tms_names ASC, tm.tms_surnames ASC
  `;

  const rows = await prisma.$queryRawUnsafe<RawRow[]>(sql, supervisedIds);

  return rows.map((r): GtVacationUnderFiveDaysRowDTO => ({
    corporateEmail:      r.corporate_email,
    billingStatus:       r.billing_status,
    workdayId:           r.workday_id,
    gender:              r.gender,
    costCenterHierarchy: r.cost_center_hierarchy,
    costCenterNames:     r.cost_center_names,
    name:                r.name,
    startDate:           r.start_date,
    country:             r.country,
    position:            r.position,
    timeoffStartDate:    r.timeoff_start_date,
    timeoffEndDate:      r.timeoff_end_date,
    days:                r.days,
    typeOfTimeoff:       r.type_of_timeoff,
    status:              r.status,
  }));
}
