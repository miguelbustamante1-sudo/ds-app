-- ============================================================
-- SVVacationDays(p_start_date, p_end_date)
--
-- Returns total vacation days for El Salvador.
-- Per SV labor law, ALL calendar days (Mon–Sun) in the range
-- are counted as vacation days, including public holidays.
-- Holiday swaps do not affect the count.
--
-- Returns: calendar days inclusive (end - start + 1)
-- ============================================================
CREATE OR REPLACE FUNCTION ds."SVVacationDays"(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_end_date - p_start_date + 1)::integer;
$$;


-- ============================================================
-- GTVacationDays(p_team_member_id, p_start_date, p_end_date)
--
-- Returns net vacation days for Guatemala:
--   workdays (Mon–Fri) in [p_start_date, p_end_date]
--   minus weekday public holidays, with holiday swaps applied:
--     • Swapped-out holidays are removed from the holiday list
--       (the original date becomes a regular working day).
--     • Replacement dates are added as virtual holidays
--       (the replacement date becomes a non-working day).
--
-- Only swaps in status 'Acknowledged' and hsw_active = true
-- are considered (mirrors getActiveSwapsForTM on the server).
--
-- Parameters:
--   p_team_member_id : ds.tbl_team_members.tms_id
--   p_start_date     : inclusive range start
--   p_end_date       : inclusive range end
--
-- Returns: net INTEGER (>= 0)
-- ============================================================
CREATE OR REPLACE FUNCTION ds."GTVacationDays"(
  p_team_member_id INTEGER,
  p_start_date     DATE,
  p_end_date       DATE
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  WITH

  -- Resolve the team member's country
  tm_country AS (
    SELECT cou_id
    FROM ds.tbl_team_members
    WHERE tms_id = p_team_member_id
  ),

  -- Resolve the "Acknowledged" status ID (active swap status)
  ack_status AS (
    SELECT sta_id
    FROM ds.tbl_to_statuses
    WHERE LOWER(TRIM(sta_name)) = 'acknowledged'
    LIMIT 1
  ),

  -- Active (acknowledged) holiday swaps for this team member
  active_swaps AS (
    SELECT
      hsw.hol_id,
      hsw.hsw_replacement_date AS replacement_date
    FROM ds.hsw_holiday_swap  hsw
    JOIN ack_status            a   ON a.sta_id = hsw.sta_id
    WHERE hsw.tms_id   = p_team_member_id
      AND hsw.hsw_active = true
  ),

  -- Effective holiday dates within [p_start_date, p_end_date]
  -- after applying swaps: originals removed, replacements added.
  --
  -- Recurring holidays: projected onto every calendar year that
  -- the range spans (matching server-side LoadHolidaysForCalc).
  -- Non-recurring: matched by exact stored date.
  effective_holidays AS (

    -- Recurring holidays (month+day projected to each spanned year)
    SELECT
      MAKE_DATE(
        y.yr,
        EXTRACT(MONTH FROM h.hol_date)::integer,
        EXTRACT(DAY   FROM h.hol_date)::integer
      ) AS eff_date
    FROM      ds.hol_holiday h
    JOIN      tm_country     c   ON c.cou_id = h.cou_id
    CROSS JOIN LATERAL (
      VALUES (EXTRACT(YEAR FROM p_start_date)::integer),
             (EXTRACT(YEAR FROM p_end_date  )::integer)
    ) AS y(yr)
    WHERE h.hol_is_active                     = true
      AND COALESCE(h.hol_is_recurring, true)  = true
      AND h.hol_id NOT IN (SELECT hol_id FROM active_swaps)
      AND MAKE_DATE(
            y.yr,
            EXTRACT(MONTH FROM h.hol_date)::integer,
            EXTRACT(DAY   FROM h.hol_date)::integer
          ) BETWEEN p_start_date AND p_end_date

    UNION ALL

    -- Non-recurring holidays (exact date)
    SELECT h.hol_date AS eff_date
    FROM   ds.hol_holiday h
    JOIN   tm_country     c ON c.cou_id = h.cou_id
    WHERE  h.hol_is_active                    = true
      AND  COALESCE(h.hol_is_recurring, true) = false
      AND  h.hol_id NOT IN (SELECT hol_id FROM active_swaps)
      AND  h.hol_date BETWEEN p_start_date AND p_end_date

    UNION ALL

    -- Replacement dates from active swaps (virtual holidays)
    SELECT replacement_date AS eff_date
    FROM   active_swaps
    WHERE  replacement_date BETWEEN p_start_date AND p_end_date
  ),

  -- Weekday holidays only (Mon–Fri, ISODOW 1–5)
  weekday_holiday_count AS (
    SELECT COUNT(*)::integer AS cnt
    FROM   effective_holidays
    WHERE  EXTRACT(ISODOW FROM eff_date) BETWEEN 1 AND 5
  ),

  -- Total workdays (Mon–Fri) in the range
  workday_count AS (
    SELECT COUNT(*)::integer AS cnt
    FROM   generate_series(p_start_date, p_end_date, '1 day'::interval) AS d
    WHERE  EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5
  )

  SELECT GREATEST(0, w.cnt - h.cnt)
  FROM   workday_count w, weekday_holiday_count h;
$$;
