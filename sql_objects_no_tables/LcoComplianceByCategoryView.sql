SELECT
    lco_workday_id,
    lco_date,
    lco_status,
    SUM(
        CASE
            WHEN lco_hours_category NOT ILIKE 'Time Off'
             AND lco_assignment     NOT ILIKE 'OC%'
            THEN lco_hours::numeric
            ELSE 0
        END
    ) AS lco_billable_hours,
    SUM(
        CASE
            WHEN lco_hours_category ILIKE 'Time Off'
             AND lco_assignment     NOT ILIKE 'OC%'
            THEN lco_hours::numeric
            ELSE 0
        END
    ) AS lco_non_billable_hours,
    SUM(
        CASE
            WHEN lco_assignment ILIKE 'OC%'
            THEN lco_hours::numeric
            ELSE 0
        END
    ) AS lco_oncall_hours
FROM es.lco_login_compliance
GROUP BY
    lco_workday_id,
    lco_date,
    lco_status;