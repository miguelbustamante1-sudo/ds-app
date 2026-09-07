-- =============================================================================
-- Purpose: Weekly vacation-hour rollup per team member, with week boundaries
--          clipped to the calendar month — a week never spans two months.
--          When a natural Mon-Sun week crosses a month boundary, it is split
--          into two segments: one ending on the last day of the earlier month,
--          and one starting on the 1st of the later month.
--
--          Example: if the 1st of a month falls on a Wednesday, the previous
--          month's segment for that week ends on Tuesday (the 30th/31st), and
--          the new month's segment starts on that Wednesday (the 1st).
--
-- Date: 2026-08-03
-- View: ds.vw_vacation_hours_by_week_month
-- =============================================================================

CREATE OR REPLACE VIEW ds.vw_vacation_hours_by_week_month AS
WITH vacation_days AS (
    SELECT
        v.tms_id        AS team_member_id,
        v.tdv_wdid,
        v.tdv_day_hours,
        GREATEST(
            date_trunc('week', v.tdv_vacation_day::timestamp with time zone)::date,
            date_trunc('month', v.tdv_vacation_day::timestamp with time zone)::date
        ) AS vpw_week_start,
        LEAST(
            (date_trunc('week', v.tdv_vacation_day::timestamp with time zone) + interval '6 days')::date,
            (date_trunc('month', v.tdv_vacation_day::timestamp with time zone) + interval '1 month - 1 day')::date
        ) AS vpw_week_end,
        EXTRACT(month FROM v.tdv_vacation_day)::integer AS vpw_month,
        EXTRACT(year FROM v.tdv_vacation_day)::integer  AS vpw_year
    FROM ds.tdv_timeoff_day_value v
    WHERE COALESCE(v.tdv_is_holiday, 0::numeric) = 0::numeric
      AND ds.fn_is_holiday(v.tms_id, v.tdv_vacation_day) = 0::numeric
      AND v.tdv_day_hours > 0::numeric
)
SELECT
    hbt.hbt_team_member_name AS vpw_resource_name,
    tm.wdid                  AS vpw_wdid,
    hbt.hbt_team_leader      AS vpw_team_leader,
    hbt.hbt_om               AS vpw_om,
    hbt.hbt_agm              AS vpw_agm,
    vd.vpw_year              AS vpw_year,
    vd.vpw_month             AS vpw_month,
    vd.vpw_week_start        AS vpw_week_start,
    vd.vpw_week_end          AS vpw_week_end,
    sum(vd.tdv_day_hours)    AS vpw_estimated_hours
FROM vacation_days vd
JOIN ds.tbl_team_members tm ON tm.tms_id = vd.team_member_id
JOIN ds.hbt_hierarchy_by_teammember hbt ON tm.wdid::text = hbt.hbt_wdid::text
GROUP BY
    tm.wdid,
    hbt.hbt_team_member_name,
    hbt.hbt_team_leader,
    hbt.hbt_om,
    hbt.hbt_agm,
    vd.vpw_year,
    vd.vpw_month,
    vd.vpw_week_start,
    vd.vpw_week_end
ORDER BY vd.vpw_year, vd.vpw_month, vd.vpw_week_start, tm.wdid;
