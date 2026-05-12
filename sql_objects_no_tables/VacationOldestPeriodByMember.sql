-- Purpose: Calculate the oldest vacation period for each active team member
--          based on the vacation balance reverse-engineering logic.
--
-- Logic:
--   1. win_vacation is the total accrued days from Workday (source of truth).
--   2. Accrual rate = 15 days/year → period_count = FLOOR(win_vacation / 15).
--   3. The current active period is determined by the member's hire-date anniversary.
--      - If today >= this year's anniversary → current period starts this year.
--      - Otherwise → current period started last year.
--   4. Oldest period start year = current_period_start_year - period_count.
--   5. All period_count historical periods sit BEFORE the current active period.
--
-- Date: 2026-05-12
-- Tables: ds.tbl_team_members, es.win_workday_info

WITH member_data AS (
    SELECT
        tm.tms_id                                              AS team_member_id,
        tm.tms_names                                           AS team_member_names,
        tm.tms_surnames                                        AS team_member_surnames,
        tm.wdid                                                AS workday_id,
        -- Prefer Workday hire date; fall back to app start date
        COALESCE(wi.win_hire_date, tm.tms_stadat)              AS hire_date,
        COALESCE(wi.win_vacation, 0)                           AS win_vacation
    FROM ds.tbl_team_members tm
    LEFT JOIN es.win_workday_info wi ON wi.win_wdid = tm.wdid
    -- Active members only (no end date or end date in the future)
    WHERE tm.tms_enddat IS NULL
       OR tm.tms_enddat > CURRENT_DATE
),

anniversary_parts AS (
    SELECT
        *,
        FLOOR(win_vacation / 15.0)::INT                        AS period_count,
        EXTRACT(YEAR  FROM CURRENT_DATE)::INT                  AS today_year,
        EXTRACT(MONTH FROM hire_date)::INT                     AS hire_month,
        -- Cap day at the last day of the month in the target year
        -- (handles the Feb-29 edge case for non-leap years)
        LEAST(
            EXTRACT(DAY FROM hire_date)::INT,
            EXTRACT(DAY FROM (
                DATE_TRUNC('month', MAKE_DATE(
                    EXTRACT(YEAR FROM CURRENT_DATE)::INT,
                    EXTRACT(MONTH FROM hire_date)::INT,
                    1
                )) + INTERVAL '1 month' - INTERVAL '1 day'
            ))::INT
        )                                                      AS safe_hire_day
    FROM member_data
),

current_period AS (
    SELECT
        *,
        CASE
            WHEN CURRENT_DATE >= MAKE_DATE(today_year, hire_month, safe_hire_day)
                THEN today_year
            ELSE today_year - 1
        END                                                    AS current_period_start_year
    FROM anniversary_parts
)

SELECT
    team_member_id,
    team_member_names || ' ' || team_member_surnames           AS team_member,
    workday_id,
    win_vacation                                               AS workday_vacation_balance,
    period_count                                               AS implied_historical_periods,
    -- Current active period (for reference)
    current_period_start_year::TEXT
        || '-' || (current_period_start_year + 1)::TEXT        AS current_period,
    -- Oldest period: walk back period_count years from current period
    (current_period_start_year - period_count)::TEXT
        || '-' || (current_period_start_year - period_count + 1)::TEXT
                                                               AS oldest_period,
    -- All implied periods listed as an array (oldest → most recent before current)
    ARRAY(
        SELECT
            (current_period_start_year - gs)::TEXT
            || '-' || (current_period_start_year - gs + 1)::TEXT
        FROM GENERATE_SERIES(period_count, 1, -1) AS gs
    )                                                          AS all_implied_periods
FROM current_period
WHERE win_vacation > 0
ORDER BY team_member_names, team_member_surnames;
