# Dynamic Reports — Author's Manual

> **Version 1.0 · April 2026**
> This manual is for users with the **Reports Admin** permission. It covers everything needed to write, configure, and publish custom SQL-based dynamic reports: from writing the query and declaring parameters, to setting up access control and publishing the report.

---

## What Is a Dynamic Report?

A dynamic report is a custom SQL `SELECT` query that you author, wrap in a parameter form, and publish to the Reports hub. When a user runs the report, they fill in the parameters you defined, and the system executes your query with those values, returning a paginated data grid they can export.

The feature gives you the flexibility of raw SQL while keeping the execution safe and controlled: queries are validated for read-only access, parameters are injected using PostgreSQL positional binding (never string concatenation), and access is governed by the existing RBAC permission system.

---

## Accessing the Management Page

Navigate to **Reports → Dynamic Reports**. This page lists all custom reports (active and inactive) and gives you buttons to create, edit, or run each one.

Click **New Report** to open the creation wizard. Click **Edit** on any row to open that report in the same wizard for editing.

The wizard has three steps:

1. **SQL Editor** — write and validate your query
2. **Parameters** — configure each parameter detected in the query
3. **Metadata** — name the report, set its group and permissions, and publish it

You must complete Step 1 successfully before proceeding. Steps 2 and 3 can be visited freely once validation passes.

---

## Step 1 — SQL Editor

### 1.1 Writing the query

The query must be a single `SELECT` statement (or a `WITH` / CTE block that ends in a `SELECT`). There is no length limit, and complex queries are fully supported:

- `JOIN` across any number of tables
- Subqueries and derived tables
- `WITH` (Common Table Expressions / CTEs)
- Aggregate functions (`SUM`, `COUNT`, `AVG`, `MIN`, `MAX`)
- Window functions (`ROW_NUMBER`, `RANK`, etc.)
- `CASE` expressions
- Any standard PostgreSQL function

The only restriction is that the statement must be read-only. See [Section 1.4 — What the safety guard rejects](#14-what-the-safety-guard-rejects) for the full list.

### 1.2 Declaring parameters

To allow users to supply values at run time, embed parameter placeholders directly in the SQL using curly braces:

```
{parameterName}
```

**Naming rules:**
- Must start with a letter or underscore (`a–z`, `A–Z`, `_`)
- Subsequent characters can be letters, digits, or underscores
- Case-sensitive: `{StartDate}` and `{startDate}` are two different parameters
- No spaces, hyphens, or special characters

**Example:**

```sql
SELECT
  emp.emp_full_name   AS "Employee",
  emp.emp_department  AS "Department",
  emp.emp_hire_date   AS "Hire Date",
  emp.emp_salary      AS "Salary"
FROM employees emp
WHERE emp.emp_department = {department}
  AND emp.emp_hire_date  >= {startDate}::date
  AND emp.emp_hire_date  <= {endDate}::date
  AND emp.emp_active     = true
ORDER BY emp.emp_hire_date DESC
```

This query has three parameters: `department`, `startDate`, and `endDate`. The system detects them automatically during validation.

### 1.3 Type casting — a critical rule

During validation, every `{placeholder}` is temporarily replaced with a PostgreSQL `NULL::text` (a null value of type `text`). This means that if you compare a parameter against a column of a different type — such as `integer`, `date`, or `boolean` — PostgreSQL will raise a type mismatch error and validation will fail.

**The fix:** add an explicit cast directly in the SQL using the `::type` PostgreSQL cast syntax.

| Column type | Cast to add | Example |
|---|---|---|
| `integer` / `bigint` | `::integer` | `WHERE proj_id = {projectId}::integer` |
| `date` | `::date` | `WHERE start_date = {startDate}::date` |
| `timestamp` | `::timestamp` | `WHERE created_at >= {since}::timestamp` |
| `boolean` | `::boolean` | `WHERE is_active = {active}::boolean` |
| `numeric` / `decimal` | `::numeric` | `WHERE amount > {minAmount}::numeric` |
| `text` / `varchar` | *(no cast needed)* | `WHERE name = {name}` |

> **Tip:** When in doubt, add the cast. It never hurts to cast `text` to `text`. It only fails when the cast is wrong or missing.

### 1.4 What the safety guard rejects

Before any database connection is made, the system runs a pure text analysis of your SQL. Any query that fails these checks is rejected outright:

| Rule | What triggers rejection |
|---|---|
| Must be read-only | Query does not start with `SELECT` or `WITH` |
| No data modification | Query contains `INSERT`, `UPDATE`, `DELETE`, or `TRUNCATE` |
| No schema modification | Query contains `DROP`, `ALTER`, or `CREATE` |
| No privilege changes | Query contains `GRANT` or `REVOKE` |
| No procedure calls | Query contains `EXECUTE` or `CALL` |
| Single statement only | A `;` appears before the end of the query |

Comments are stripped before analysis, so you cannot hide a blocked keyword inside a `--` or `/* */` comment.

### 1.5 Validating the query

Click **Validate & Preview** to run the safety check and a dry-run against the database. The dry-run wraps your query in:

```sql
SELECT * FROM ( <your query, all {params} replaced with NULL::text> ) AS __validate_result__ LIMIT 0
```

This executes nothing meaningful (LIMIT 0 returns no rows) but causes the database to resolve column names and check type compatibility.

On success, the panel shows:
- A green **SQL validated** badge
- The list of **columns** the query returns (auto-used as grid headers)
- The list of **parameters** detected (badges for each `{name}`)

On failure, a red error box shows the exact PostgreSQL error message. Use it to pinpoint the problem — a missing cast, a misspelled column name, or a missing table alias.

> **If you edit the SQL after a successful validation**, a warning banner appears: *"SQL changed — please re-validate."* You must validate again before saving.

---

## Step 2 — Parameters

Step 2 lists every `{parameterName}` found in your SQL, in the order they first appear. For each parameter you configure how it behaves on the run form.

### 2.1 Parameter fields

| Field | Required | Description |
|---|---|---|
| **Label** | Yes | Human-readable name shown above the input on the run form (e.g., `Start Date`, `Department`) |
| **Type** | Yes | The kind of input to render. See [Section 2.2](#22-parameter-types) |
| **Required** | Yes | If on, the user must supply a value before the Run Report button becomes active |
| **Default value** | No | Pre-filled value shown when the run form opens. Leave blank for no default |
| **Display order** | Yes | Integer controlling the left-to-right / top-to-bottom layout on the run form. Lower numbers appear first |

### 2.2 Parameter types

#### `text`
A plain text input field. Use for names, codes, and any string value.

No cast needed in the SQL (the placeholder is already `::text` internally).

```sql
WHERE emp.emp_full_name ILIKE '%' || {nameSearch} || '%'
```

---

#### `number`
A numeric input field. The value is passed as a number. Always cast in SQL when comparing to an integer or decimal column:

```sql
WHERE proj.proj_id = {projectId}::integer
```

---

#### `date`
A date picker. Values are provided by the user in `yyyy-MM-dd` format. Always cast to `::date` in SQL:

```sql
WHERE req.req_start_date >= {startDate}::date
```

---

#### `boolean`
A toggle switch (Yes / No). Always cast to `::boolean` in SQL:

```sql
WHERE emp.emp_active = {includeActive}::boolean
```

Default values: use `true` or `false` (lowercase).

---

#### `select`
A dropdown (combobox). Requires an options definition — either a static list or a SQL query. See [Section 2.3](#23-select-parameter-options).

No cast is usually needed because the value is always a string (the `value` field from the selected option). Cast if the underlying column is not text.

---

### 2.3 Select parameter options

When you set a parameter's type to **select**, a second section appears asking how the dropdown options are sourced.

#### Static options

A fixed JSON array defined directly in the wizard. Format:

```json
[
  { "value": "ACTIVE",    "label": "Active" },
  { "value": "INACTIVE",  "label": "Inactive" },
  { "value": "PENDING",   "label": "Pending" }
]
```

- `value` — the raw value passed to the SQL query (what replaces the `{placeholder}`)
- `label` — the human-readable text shown in the dropdown to the user

Use static options when the list is small and does not change (e.g., status codes, categories).

#### Dynamic options (SQL query)

A SQL query executed at run time to build the dropdown list. The query must return exactly two columns named `value` and `label`:

```sql
SELECT dept_code AS value, dept_name AS label
FROM departments
WHERE dept_active = true
ORDER BY dept_name
```

The user sees `dept_name` in the dropdown. When they select an option, `dept_code` is what gets substituted into the report query.

Use dynamic options when the list comes from a database table that changes over time (e.g., employee names, project codes, departments).

> **Important:** The options query runs every time the run form is opened. Keep it fast — avoid large table scans or complex joins.

---

### 2.4 Using the same parameter more than once

You can reference the same placeholder multiple times in a query. The system maps each unique name to a single positional binding, so the user is only asked once:

```sql
SELECT * FROM employees
WHERE (emp_first_name ILIKE '%' || {nameSearch} || '%'
    OR emp_last_name  ILIKE '%' || {nameSearch} || '%')
```

`{nameSearch}` appears twice, but only one input field is shown on the run form.

---

### 2.5 Queries with no parameters

If your SQL has no `{placeholders}`, Step 2 is shown as empty and you can proceed directly to Step 3. The report will run immediately when users open it (no run form shown).

---

## Step 3 — Metadata

Set the report's identity and control who can see it.

| Field | Required | Notes |
|---|---|---|
| **Name** | Yes | Displayed on the report card in the hub and on the report's run page |
| **Description** | No | Short text (one or two sentences) shown under the name on the report card |
| **Group** | No | Category label used to group the card in the hub (e.g., `Finance`, `Time Off`, `Workforce`). An autocomplete suggests existing groups |
| **Permission** | No | RBAC permission resource key. Only users whose role includes READ access to this resource can see and run the report. Leave blank to allow any authenticated user with the Reports.read permission |
| **Active** | Yes | Toggle to publish or unpublish the report. Inactive reports are invisible in the hub but remain in the management list |

Click **Save** to create or update the report. The wizard closes and you are returned to the Dynamic Reports list.

---

## How Execution Works

Understanding what happens when a user clicks **Run Report** helps you write better queries and troubleshoot issues.

### Parameter substitution

The system scans your saved SQL for all `{parameterName}` placeholders and replaces them with PostgreSQL positional parameters (`$1`, `$2`, …) in order of first appearance. The actual values are bound separately, never concatenated into the SQL string. This completely eliminates SQL injection.

**Example:**

Your saved SQL:
```sql
SELECT * FROM employees WHERE dept = {dept} AND salary > {salary} AND dept != {dept}
```

After substitution with `dept = 'Sales'`, `salary = 50000`:
```sql
SELECT * FROM employees WHERE dept = $1 AND salary > $2 AND dept != $1
-- Bound values: $1 = 'Sales', $2 = 50000
```

Notice that `{dept}` appeared twice but maps to the same `$1` binding.

### Pagination

Results are returned in pages. The default page size is 25 rows. Users can change it to 50 or 100. The system adds `LIMIT` and `OFFSET` to your query automatically — you do not need to add them yourself.

A separate `COUNT(*)` query also runs to determine the total number of rows, which drives the pagination controls.

### Export

When the user clicks **Export**, your full query runs without `LIMIT`/`OFFSET` (up to 50,000 rows) and the results are streamed as an XLSX or CSV file. The filename is `{ReportName}-{YYYY-MM-DD}.xlsx` (or `.csv`).

---

## SQL Authoring Guide

### CTEs (WITH clauses)

CTEs are fully supported and encouraged for readability:

```sql
WITH active_projects AS (
  SELECT proj_id, proj_name, proj_budget
  FROM projects
  WHERE proj_active = true
    AND proj_start_date >= {startDate}::date
),
employee_hours AS (
  SELECT proj_id, SUM(hours_logged) AS total_hours
  FROM timesheets
  GROUP BY proj_id
)
SELECT
  ap.proj_name        AS "Project",
  ap.proj_budget      AS "Budget",
  eh.total_hours      AS "Hours Logged"
FROM active_projects ap
LEFT JOIN employee_hours eh ON eh.proj_id = ap.proj_id
ORDER BY ap.proj_name
```

### Aggregates and GROUP BY

```sql
SELECT
  emp.emp_department        AS "Department",
  COUNT(*)                  AS "Headcount",
  AVG(emp.emp_salary)       AS "Avg Salary",
  MIN(emp.emp_hire_date)    AS "Earliest Hire"
FROM employees emp
WHERE emp.emp_active = true
  AND emp.emp_hire_date >= {since}::date
GROUP BY emp.emp_department
ORDER BY COUNT(*) DESC
```

### Conditional logic

Use `CASE` to transform values inline:

```sql
SELECT
  req.req_id,
  emp.emp_full_name,
  CASE req.req_status
    WHEN 'A' THEN 'Approved'
    WHEN 'P' THEN 'Pending'
    WHEN 'R' THEN 'Rejected'
    ELSE req.req_status
  END AS "Status"
FROM time_off_requests req
JOIN employees emp ON emp.emp_id = req.emp_id
WHERE req.req_start_date >= {startDate}::date
```

### Formatting dates in output

To control how dates appear in the results grid, format them in SQL:

```sql
TO_CHAR(emp.emp_hire_date, 'DD-Mon-YYYY') AS "Hire Date"
```

### Aliasing columns

Column aliases (the `AS "..."` part) become the grid headers in the results. Use descriptive, human-readable aliases. Double-quote aliases that contain spaces or mixed case.

```sql
SELECT
  emp.emp_id          AS "ID",
  emp.emp_full_name   AS "Full Name",
  emp.emp_hire_date   AS "Hire Date"
FROM employees emp
```

---

## Common Errors and How to Fix Them

| Error message | Cause | Fix |
|---|---|---|
| `operator does not exist: text = integer` | A `{param}` is compared to an integer column without a cast | Add `::integer` after the placeholder: `{projectId}::integer` |
| `invalid input syntax for type date` | A `{param}` is compared to a date column without a cast | Add `::date` after the placeholder: `{startDate}::date` |
| `column "x" does not exist` | Misspelled column name or missing table alias | Check the column name and qualify with the table alias |
| `SQL must contain only a single statement` | A `;` appears in the middle of the query | Remove the semicolon; the system adds its own termination |
| `Only SELECT or WITH statements are allowed` | Query starts with something other than `SELECT` or `WITH` | Rewrite as a `SELECT` |
| `SQL changed — please re-validate` | SQL was edited after a successful validation | Click Validate & Preview again |
| Select options dropdown is empty at run time | Options SQL query returns no rows or has an error | Run the options query directly in a database client to verify |

---

## Best Practices

- **Use meaningful column aliases.** `emp_hire_date` as a header is worse than `"Hire Date"`. Users read the headers, not the column names.
- **Always cast date and numeric parameters.** Even if it seems to work without the cast in some versions of PostgreSQL, an explicit cast is clearer and guaranteed to pass validation.
- **Keep options queries fast.** Dynamic select options are loaded every time a user opens the run form. Avoid querying large tables without filtering.
- **Use `ILIKE` for flexible text search.** It handles case differences automatically: `WHERE name ILIKE '%' || {search} || '%'`.
- **Test with boundary values before publishing.** Run the report with empty strings, date-boundary values, and edge-case inputs before setting it to Active.
- **Set a sensible display order on parameters.** Put date-range parameters first (Start Date, End Date), then filters (Department, Status), then optional refinements last.
- **Use required sparingly.** If a parameter has a useful default (e.g., the current month), mark it optional with a default so users can run the report without touching it.
- **Group related reports.** Use the Group field consistently (`Time Off`, `Payroll`, `Workforce`) so the Reports hub stays organized as more reports are added.

---

## Permissions Quick Reference

| Permission | What it allows |
|---|---|
| `Reports.read` | View the Reports hub, run any report the user has access to |
| `Reports.create` | Access the Dynamic Reports management page, create and edit reports, validate SQL |
| `Reports.delete` | Deactivate reports (soft-delete; reports are not permanently removed) |

The **Permission** field in Step 3 adds a second layer of access control at the report level. If set, only users whose role includes READ access to that specific permission resource can see and run the report, regardless of whether they have `Reports.read`.

---

## Frequently Asked Questions

**Q: Can I use a `WITH` (CTE) block instead of a plain `SELECT`?**
Yes. Queries starting with `WITH` are fully supported. The final statement in the CTE block must be a `SELECT`.

---

**Q: Can I call stored procedures or functions?**
You can call PostgreSQL functions within a `SELECT` expression (e.g., `SELECT my_function(arg)`). You cannot use `CALL` or `EXECUTE` — those are blocked by the safety guard.

---

**Q: My parameter doesn't appear in Step 2. Why?**
Step 2 lists parameters detected during the last successful validation. If you added a new `{placeholder}` after validating, go back to Step 1 and re-validate to pick it up.

---

**Q: Can I reorder parameters after detection?**
Yes. Use the **Display order** field in Step 2 to control the layout on the run form independently of the order the parameters appear in the SQL.

---

**Q: What happens to existing parameter values when I edit and save a report?**
All parameters are replaced on save. The new parameter definitions from the wizard overwrite the previous ones. Users running the report after your edit will see the updated form.

---

**Q: The validation passes but the report errors at run time. What could cause that?**
Validation uses `LIMIT 0` so it never reads actual data. A run-time error can happen if:
- A parameter value fails a cast at run time (e.g., the user typed letters into a field expected to be `::integer`)
- A subquery or CTE references data that causes a type error only with real values
- Database-level permissions differ between the validation context and execution context

Check the exact error message shown on the run page. If needed, test the substituted query directly in a database client.

---

**Q: Can I duplicate a report?**
There is no built-in duplicate function. Open the original report in the wizard, copy the SQL (Step 1), then click **New Report** and paste the SQL into the new wizard. Step 2 and Step 3 will need to be reconfigured manually.

---

**Q: What is the maximum number of rows an export can return?**
50,000 rows. If your query can return more, add a filter parameter or a date-range constraint to let users narrow the result set before exporting.

---

*For issues or questions not covered here, contact your system administrator or submit a support ticket through the internal helpdesk.*
