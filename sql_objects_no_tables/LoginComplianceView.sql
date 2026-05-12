CREATE OR REPLACE VIEW es.v_lco_compliance_deduplicated AS
WITH RankedCompliance AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (
            PARTITION BY lco_workday_id, lco_date 
            ORDER BY 
                -- Priority 1: Pick records where hours are greater than 0
                CASE WHEN CAST(lco_hours AS DECIMAL) > 0 THEN 0 ELSE 1 END ASC,
                
                -- Priority 2: For weekend duplicates, prioritize 'Billable'
                CASE 
                    WHEN EXTRACT(DOW FROM CAST(lco_date AS TIMESTAMP)) IN (0, 6) 
                         AND lco_hours_category = 'Billable' THEN 0 
                    ELSE 1 
                END ASC,
                
                -- Priority 3: Tie-breaker using the most recent creation timestamp
                lco_created_at DESC
        ) as rank_priority
    FROM es.lco_login_compliance
)
SELECT 
    lco_id,
    lco_workday_id,
    lco_date,
    lco_hours,
    lco_hours_category,
    lco_status,
    lco_assignment,
    lco_project,
    lco_bill_rate_currency,
    lco_bill_rate,
    lco_intercompany_bill_rate_currency,
    lco_intercompany_bill_rate,
    lco_timecard_record_id,
    lco_created_at
FROM RankedCompliance
WHERE rank_priority = 1;