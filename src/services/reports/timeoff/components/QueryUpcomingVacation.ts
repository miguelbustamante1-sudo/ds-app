import { prisma } from '../../../../db/prisma';
import type { UpcomingVacationRowDTO, UpcomingVacationType } from '@shared/dto/UpcomingVacation';

interface RawUpcomingVacationRow {
  workday_id: string | null;
  full_name: string;
  email: string | null;
  type: string;
  category: string;
  start_date: Date | string;
  end_date: Date | string;
  status: string;
  days: number | string;
}

function toISODate(val: Date | string | null | undefined): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0] ?? '';
  return String(val).split('T')[0] ?? '';
}

export async function queryUpcomingVacation(
  supervisedIds: number[],
  today: Date,
  cutoffDate: Date,
  teamMemberId: number | null,
): Promise<UpcomingVacationRowDTO[]> {
  if (supervisedIds.length === 0) return [];

  const todayStr = today.toISOString().split('T')[0];
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const teamMemberFilter = teamMemberId !== null
    ? `AND tm.tms_id = $4`
    : '';

  const values: unknown[] = [supervisedIds, todayStr, cutoffStr];
  if (teamMemberId !== null) values.push(teamMemberId);

  const sql = `
    SELECT
      tm.wdid                                                                   AS workday_id,
      CASE
        WHEN tm.tms_known_as IS NOT NULL
          THEN tm.tms_known_as || ' ' || tm.tms_surnames
        ELSE tm.tms_names || ' ' || tm.tms_surnames
      END                                                                       AS full_name,
      (SELECT usr_email FROM ds.tbl_users WHERE tms_id = tm.tms_id LIMIT 1)   AS email,
      'Time Off'                                                                AS type,
      COALESCE(cat.tot_name, '')                                                AS category,
      tto.tto_stadat::date                                                      AS start_date,
      tto.tto_enddat::date                                                      AS end_date,
      sta.sta_name                                                              AS status,
      tto.tto_days::numeric                                                     AS days
    FROM ds.tbl_tms_time_off tto
    JOIN ds.tbl_team_members      tm  ON tm.tms_id  = tto.tms_id
    JOIN ds.tbl_to_statuses       sta ON sta.sta_id = tto.sta_id
    LEFT JOIN ds.tot_time_off_types cat ON cat.tot_id = tto.tot_id
    WHERE tto.tms_id = ANY($1::int[])
      AND tto.tto_active = 1
      AND tto.sta_id NOT IN (4, 5, 6)
      AND tto.tto_stadat <= $3::date
      AND tto.tto_enddat >= $2::date
      ${teamMemberFilter}

    UNION ALL

    SELECT
      tm.wdid                                                                   AS workday_id,
      CASE
        WHEN tm.tms_known_as IS NOT NULL
          THEN tm.tms_known_as || ' ' || tm.tms_surnames
        ELSE tm.tms_names || ' ' || tm.tms_surnames
      END                                                                       AS full_name,
      (SELECT usr_email FROM ds.tbl_users WHERE tms_id = tm.tms_id LIMIT 1)   AS email,
      'Holiday Swap'                                                            AS type,
      'Holiday Swap'                                                            AS category,
      hs.hsw_original_date::date                                               AS start_date,
      hs.hsw_replacement_date::date                                            AS end_date,
      sta.sta_name                                                              AS status,
      1                                                                         AS days
    FROM ds.hsw_holiday_swap hs
    JOIN ds.tbl_team_members   tm  ON tm.tms_id  = hs.tms_id
    JOIN ds.tbl_to_statuses    sta ON sta.sta_id = hs.sta_id
    WHERE hs.tms_id = ANY($1::int[])
      AND hs.hsw_active = true
      AND hs.sta_id NOT IN (4, 5, 6)
      AND (
        hs.hsw_original_date    BETWEEN $2::date AND $3::date
        OR hs.hsw_replacement_date BETWEEN $2::date AND $3::date
      )
      ${teamMemberFilter}

    ORDER BY start_date ASC, full_name ASC
  `;

  const rows = await prisma.$queryRawUnsafe<RawUpcomingVacationRow[]>(sql, ...values);

  return rows.map((r): UpcomingVacationRowDTO => ({
    workdayId: r.workday_id,
    fullName:  r.full_name,
    email:     r.email,
    type:      r.type as UpcomingVacationType,
    category:  r.category,
    startDate: toISODate(r.start_date),
    endDate:   toISODate(r.end_date),
    status:    r.status,
    days:      Number(r.days),
  }));
}
