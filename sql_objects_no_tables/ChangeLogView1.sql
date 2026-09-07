CREATE OR REPLACE VIEW ds.vw_timeoff_changelog_activity AS
SELECT
    tto.tto_id                                                           AS timeoff_id,
    COALESCE(tm.tms_known_as, tm.tms_names) || ' ' || tm.tms_surnames  AS team_member,
    tot.tot_name                                                         AS time_off_type,
    tto.tto_stadat                                                       AS start_date,
    tto.tto_enddat                                                       AS end_date,
    sta.sta_name                                                         AS status,
    toc.toc_created_at                                                   AS change_date,
    toc.toc_comment                                                      AS change_comment,
    (
        SELECT STRING_AGG(
            diff.field_key
                || ': '
                || COALESCE(toc.toc_old_values::jsonb ->> diff.field_key, '(empty)')
                || ' → '
                || COALESCE(toc.toc_new_values::jsonb ->> diff.field_key, '(empty)'),
            ' | '
            ORDER BY diff.field_key
        )
        FROM (
            SELECT DISTINCT key AS field_key
            FROM (
                SELECT jsonb_object_keys(CASE WHEN jsonb_typeof(toc.toc_old_values::jsonb) = 'object' THEN toc.toc_old_values::jsonb ELSE '{}'::jsonb END) AS key
                UNION
                SELECT jsonb_object_keys(CASE WHEN jsonb_typeof(toc.toc_new_values::jsonb) = 'object' THEN toc.toc_new_values::jsonb ELSE '{}'::jsonb END) AS key
            ) all_keys
            WHERE (CASE WHEN jsonb_typeof(toc.toc_old_values::jsonb) = 'object' THEN toc.toc_old_values::jsonb ELSE '{}'::jsonb END ->> key)
                  IS DISTINCT FROM
                  (CASE WHEN jsonb_typeof(toc.toc_new_values::jsonb) = 'object' THEN toc.toc_new_values::jsonb ELSE '{}'::jsonb END ->> key)
        ) diff
    )                                                                    AS changed_fields
FROM ds.tbl_tms_time_off         tto
JOIN ds.tbl_team_members         tm  ON tm.tms_id = tto.tms_id
JOIN ds.tot_time_off_types       tot ON tot.tot_id = tto.tot_id
JOIN ds.tbl_to_statuses          sta ON sta.sta_id = tto.sta_id
JOIN ds.toc_timeoff_changelog    toc ON toc.tto_id = tto.tto_id;
