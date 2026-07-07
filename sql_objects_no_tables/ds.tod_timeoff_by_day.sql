CREATE OR REPLACE VIEW ds.tod_timeoff_by_day AS

-- Branch 1: All countries except GT (cou_id = 1) and MX (cou_id = 2)
-- Weekends included — no DOW filter
SELECT
    tto.tto_id,
    tto.tms_id,
    tms.tms_names                                                           AS tod_names,
    tms.tms_surnames                                                        AS tod_surnames,
    tms.wdid                                                                AS tod_wdid,
    tot.tot_name                                                            AS tod_type_of_timeoff,
    tto.tto_stadat                                                          AS tod_range_start,
    tto.tto_enddat                                                          AS tod_range_end,
    generate_series(
        tto.tto_stadat::timestamp with time zone,
        tto.tto_enddat::timestamp with time zone,
        '1 day'::interval
    )::date                                                                 AS tod_day,
    sta.sta_name                                                            AS tod_status,
    false                                                                   AS tod_united,
    ''::text                                                                AS tod_original_ranges
FROM ds.tbl_tms_time_off         tto
JOIN ds.tbl_team_members         tms ON tms.tms_id = tto.tms_id
JOIN ds.tot_time_off_types       tot ON tot.tot_id  = tto.tot_id
JOIN ds.tbl_to_statuses          sta ON sta.sta_id  = tto.sta_id
WHERE (tto.sta_id <> ALL (ARRAY[4, 5, 6]))
  AND (tto.tto_original_id IS NULL OR tms.cou_id <> 1)
  AND tms.cou_id <> 2

UNION ALL

-- Branch 2: MX (cou_id = 2)
-- Weekends excluded via lateral DOW filter
SELECT
    tto.tto_id,
    tto.tms_id,
    tms.tms_names                                                           AS tod_names,
    tms.tms_surnames                                                        AS tod_surnames,
    tms.wdid                                                                AS tod_wdid,
    tot.tot_name                                                            AS tod_type_of_timeoff,
    tto.tto_stadat                                                          AS tod_range_start,
    tto.tto_enddat                                                          AS tod_range_end,
    d.tod_day,
    sta.sta_name                                                            AS tod_status,
    false                                                                   AS tod_united,
    ''::text                                                                AS tod_original_ranges
FROM ds.tbl_tms_time_off         tto
JOIN ds.tbl_team_members         tms ON tms.tms_id = tto.tms_id
JOIN ds.tot_time_off_types       tot ON tot.tot_id  = tto.tot_id
JOIN ds.tbl_to_statuses          sta ON sta.sta_id  = tto.sta_id
JOIN LATERAL (
    SELECT gs.gs::date AS tod_day
    FROM generate_series(
        tto.tto_stadat::timestamp with time zone,
        tto.tto_enddat::timestamp with time zone,
        '1 day'::interval
    ) gs(gs)
    WHERE EXTRACT(dow FROM gs.gs) <> ALL (ARRAY[0::numeric, 6::numeric])
) d ON true
WHERE (tto.sta_id <> ALL (ARRAY[4, 5, 6]))
  AND (tto.tto_original_id IS NULL OR tms.cou_id <> 1)
  AND tms.cou_id = 2

UNION ALL

-- Branch 3: GT united requests (cou_id = 1, tto_original_id IS NOT NULL)
-- Weekends included — no DOW filter
-- Collapses split requests into a single 14-day range from the earliest start date
SELECT
    MIN(tto.tto_id)                                                         AS tto_id,
    tto.tms_id,
    tms.tms_names                                                           AS tod_names,
    tms.tms_surnames                                                        AS tod_surnames,
    tms.wdid                                                                AS tod_wdid,
    tot.tot_name                                                            AS tod_type_of_timeoff,
    MIN(tto.tto_stadat)                                                     AS tod_range_start,
    MAX(tto.tto_enddat)                                                     AS tod_range_end,
    generate_series(
        MIN(tto.tto_stadat)::timestamp with time zone,
        (MIN(tto.tto_stadat) + '14 days'::interval)::timestamp with time zone,
        '1 day'::interval
    )::date                                                                 AS tod_day,
    sta.sta_name                                                            AS tod_status,
    true                                                                    AS tod_united,
    string_agg(
        (tto.tto_stadat::text || '→' || tto.tto_enddat::text),
        ', '
        ORDER BY tto.tto_stadat
    )                                                                       AS tod_original_ranges
FROM ds.tbl_tms_time_off         tto
JOIN ds.tbl_team_members         tms ON tms.tms_id = tto.tms_id
JOIN ds.tot_time_off_types       tot ON tot.tot_id  = tto.tot_id
JOIN ds.tbl_to_statuses          sta ON sta.sta_id  = tto.sta_id
WHERE (tto.sta_id <> ALL (ARRAY[4, 5, 6]))
  AND tto.tto_original_id IS NOT NULL
  AND tms.cou_id = 1
GROUP BY
    tto.tms_id,
    tto.tto_original_id,
    tms.tms_names,
    tms.tms_surnames,
    tms.wdid,
    tot.tot_name,
    sta.sta_name;