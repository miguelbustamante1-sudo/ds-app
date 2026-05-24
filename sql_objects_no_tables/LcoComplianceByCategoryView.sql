CREATE OR REPLACE VIEW es.v_lco_compliance_by_category AS
SELECT
    lco_workday_id,
    lco_date,
    lco_status,
    SUM(CASE WHEN lco_hours_category = 'Billable'
             THEN CAST(lco_hours AS DECIMAL) ELSE 0 END) AS lco_billable_hours,
    SUM(CASE WHEN lco_hours_category NOT IN ('Billable', 'Time Off')
             THEN CAST(lco_hours AS DECIMAL) ELSE 0 END) AS lco_non_billable_hours,
    SUM(CASE WHEN lco_project ILIKE 'OC%'
             THEN CAST(lco_hours AS DECIMAL) ELSE 0 END) AS lco_oncall_hours
FROM es.lco_login_compliance
GROUP BY lco_workday_id, lco_date, lco_status;
