CREATE OR REPLACE FUNCTION ds.fn_sv_vacation_days(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_end_date - p_start_date + 1)::integer;
$$;
