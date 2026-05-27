

CREATE OR REPLACE FUNCTION ds.fn_gt_vacation_days(
  p_team_member_id INTEGER,
  p_start_date     DATE,
  p_end_date       DATE
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  WITH

  tm_country AS (
    SELECT cou_id
    FROM ds.tbl_team_members
    WHERE tms_id = p_team_member_id
  ),

  ack_status AS (
    SELECT sta_id
    FROM ds.tbl_to_statuses
    WHERE LOWER(TRIM(sta_name)) = 'acknowledged'
    LIMIT 1
  ),

  active_swaps AS (
    SELECT
      hsw.hol_id,
      hsw.hsw_replacement_date AS replacement_date
    FROM ds.hsw_holiday_swap  hsw
    JOIN ack_status            a   ON a.sta_id = hsw.sta_id
    WHERE hsw.tms_id    = p_team_member_id
      AND hsw.hsw_active = true
  ),

  effective_holidays AS (

    SELECT
      MAKE_DATE(
        y.yr,
        EXTRACT(MONTH FROM h.hol_date)::integer,
        EXTRACT(DAY   FROM h.hol_date)::integer
      ) AS eff_date,
      COALESCE(h.hol_is_half_day, false) AS is_half_day
    FROM      ds.hol_holiday h
    JOIN      tm_country     c   ON c.cou_id = h.cou_id
    CROSS JOIN LATERAL (
      VALUES (EXTRACT(YEAR FROM p_start_date)::integer),
             (EXTRACT(YEAR FROM p_end_date  )::integer)
    ) AS y(yr)
    WHERE h.hol_is_active                    = true
      AND COALESCE(h.hol_is_recurring, true) = true
      AND h.hol_id NOT IN (SELECT hol_id FROM active_swaps)
      AND MAKE_DATE(
            y.yr,
            EXTRACT(MONTH FROM h.hol_date)::integer,
            EXTRACT(DAY   FROM h.hol_date)::integer
          ) BETWEEN p_start_date AND p_end_date

    UNION ALL

    SELECT
      h.hol_date AS eff_date,
      COALESCE(h.hol_is_half_day, false) AS is_half_day
    FROM   ds.hol_holiday h
    JOIN   tm_country     c ON c.cou_id = h.cou_id
    WHERE  h.hol_is_active                    = true
      AND  COALESCE(h.hol_is_recurring, true) = false
      AND  h.hol_id NOT IN (SELECT hol_id FROM active_swaps)
      AND  h.hol_date BETWEEN p_start_date AND p_end_date

    UNION ALL

    -- Replacement dates from active swaps are always full holidays
    SELECT
      replacement_date AS eff_date,
      false            AS is_half_day
    FROM   active_swaps
    WHERE  replacement_date BETWEEN p_start_date AND p_end_date
  ),

  weekday_holiday_count AS (
    SELECT COALESCE(SUM(CASE WHEN is_half_day THEN 0.5 ELSE 1.0 END), 0) AS cnt
    FROM   effective_holidays
    WHERE  EXTRACT(ISODOW FROM eff_date) BETWEEN 1 AND 5
  ),

  workday_count AS (
    SELECT COUNT(*)::numeric AS cnt
    FROM   generate_series(p_start_date, p_end_date, '1 day'::interval) AS d
    WHERE  EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5
  )

  SELECT GREATEST(0, w.cnt - h.cnt)
  FROM   workday_count w, weekday_holiday_count h;
$$;