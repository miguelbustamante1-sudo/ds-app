# Reports — User Manual

> **Version 1.0 · March 2026**
> This manual covers the Reports module: how to browse and run built-in reports, export results, and — for administrators — how to create and manage custom SQL-based dynamic reports.

---

## What is the Reports Module?

The Reports module is a centralized hub for running operational and analytical reports across the system. It provides two kinds of reports:

- **Built-in reports** — pre-configured reports for specific operational data (e.g., Time-Off Change Log). These have structured filters, multi-tab views, and fixed column layouts.
- **Dynamic reports** — custom SQL-based reports that can be created and managed by authorized users. They support configurable parameters and generate results dynamically from the database.

---

## Quick-Reference: Report Types

| Report Type | Who creates it | How to run it | Export |
|---|---|---|---|
| **Built-in** | System (pre-configured) | Click the report card | XLSX / CSV |
| **Dynamic** | Authorized users via wizard | Click the report card or run from the Dynamic Reports list | XLSX / CSV |

---

## Part 1 — The Reports Hub

### Where to find it

Navigate to **Reports** from the main menu. This is the main entry point for all reports you have access to.

### 1.1 Browsing reports

Reports are displayed as cards, grouped by category. Each card shows:

- The report **name**
- A short **description** of what it covers

Only reports you have permission to view are shown.

### 1.2 Searching for a report

Use the search bar at the top of the page to filter report cards by name or description. The filter applies in real time across all visible reports.

### 1.3 Opening a report

Click any report card to open that report's page.

### 1.4 Dynamic Reports link

If you have permission to manage dynamic reports, a **Dynamic Reports** entry appears in the report list. Click it to open the Dynamic Reports management page (see Part 4).

---

## Part 2 — Time-Off Change Log

### Where to find it

Click the **Time-Off Change Log** card in the Reports hub.

### 2.1 What this report shows

The Time-Off Change Log records every change made to time-off requests: status transitions, date modifications, category changes, and reviewer assignments. Each row captures the **original value** alongside the **new value** so you can see exactly what changed, who changed it, and when.

### 2.2 Tabs — four views of the same data

The report is organized into four tabs. Each tab applies a different grouping and default filter set:

| Tab | Primary use |
|---|---|
| **By Employee** | See all changes for a specific team member |
| **By Date Range** | See all changes that occurred within a date window |
| **By Category** | See changes grouped by time-off category |
| **By Reviewer** | See changes made or reviewed by a specific person |

All tabs share the same column layout and export functionality. Switch tabs to change the active filter context.

### 2.3 Filters

Each tab exposes a set of filters appropriate to that view. Common filters include:

| Filter | Description |
|---|---|
| **Date Range** | Limit results to changes that occurred between two dates |
| **Employee** | Multi-select list of team members |
| **Category** | Multi-select list of time-off categories |
| **Reviewer** | Multi-select list of reviewers |
| **Status** | Multi-select list of time-off statuses |

Apply filters and click **Search** (or the equivalent action button) to refresh the results. Filters can be combined freely across fields.

### 2.4 Reading the results grid

The results grid is organized into three column groups:

| Group | Columns |
|---|---|
| **Context** | Employee name, time-off category, the date the change occurred, and who made the change |
| **Original** | The values before the change (e.g., previous status, previous dates) |
| **New** | The values after the change |

Status values are displayed as color-coded badges for quick scanning. Dates are formatted for readability.

### 2.5 Sorting and pagination

Click any column header to sort by that column. Use the rows-per-page selector at the bottom of the grid to display 5, 10, or 25 rows at a time.

### 2.6 Exporting results

Click the **Export** button above the grid to download the current results. Two formats are available:

- **XLSX** — Microsoft Excel workbook
- **CSV** — Comma-separated values for use in any spreadsheet application

The export includes all rows matching the current filters, not just the visible page.

---

## Part 3 — Running a Dynamic Report

### Where to find it

Click any dynamic report card in the Reports hub. Alternatively, open the Dynamic Reports management page (Part 4) and click **Run** on any report in the list.

### 3.1 The parameter form

Before results are displayed, you must fill in the report's parameters. The parameter form lists every input the report requires.

Each parameter has a label, an optional hint, and one of the following input types:

| Input type | How it works |
|---|---|
| **Text** | Free-text entry |
| **Number** | Numeric entry |
| **Date** | Date picker |
| **Boolean** | Toggle (Yes / No) |
| **Select** | Dropdown with a fixed list of options or options loaded from the database |

Parameters marked as required must be filled before the report can be run. Optional parameters may have default values pre-filled.

### 3.2 Running the report

Click **Run Report** after filling in all required parameters. The system executes the underlying SQL query with your inputs and displays the results in a paginated grid below the parameter form.

### 3.3 Reading the results

Columns are generated dynamically from the query output. Each column header matches the column name returned by the query. Column widths adjust to fit the content.

Use the rows-per-page selector to control how many results appear per page.

### 3.4 Exporting results

Click **Export** to download the full result set. The same XLSX and CSV options are available as in built-in reports.

### 3.5 Re-running with different parameters

Adjust any parameter value and click **Run Report** again. The results grid refreshes with the new inputs.

---

## Part 4 — Dynamic Reports Management

> This section is for users with the **Reports Admin** permission. If you do not see a Dynamic Reports card in the Reports hub, you do not have access to this section.

### Where to find it

Click the **Dynamic Reports** card in the Reports hub, or navigate directly to **Reports → Dynamic Reports**.

### 4.1 The Dynamic Reports list

The list shows all custom SQL reports that have been created. Each row displays:

| Column | Description |
|---|---|
| **Name** | The report's display name |
| **Description** | A short summary of what the report returns |
| **Group** | The category the report belongs to in the hub |
| **Active** | Whether the report is visible to users in the hub |

From this list you can:

- Click **Run** on any row to go directly to that report's run page.
- Click **Edit** (or the row itself) to open the report in the wizard for editing.
- Click **New Report** to open the wizard and create a new report.

### 4.2 Creating or editing a report — the three-step wizard

Dynamic reports are created and edited through a three-step wizard.

---

#### Step 1 — SQL Editor

Write the SQL query that powers the report.

- Use a standard SQL `SELECT` statement.
- To define a parameter that users will supply at run time, embed it in the query using the syntax `{parameterName}` (curly braces). For example: `WHERE start_date >= {startDate}`.
- Click **Validate** to check the query syntax. Validation confirms the query is well-formed and identifies the columns and parameters it contains.
- You must validate successfully before proceeding to Step 2.

> **Security note:** Only `SELECT` statements are accepted. The editor will reject any query containing `INSERT`, `UPDATE`, `DELETE`, `DROP`, or other data-modification statements.

> **Type casting:** During validation, every `{parameter}` placeholder is temporarily replaced with a `NULL` of type `text`. If you compare a parameter against a non-text column (e.g. an integer or date column), PostgreSQL will raise a type mismatch error and validation will fail. To fix this, add an explicit cast to the expected type in your SQL. For example: `WHERE pro_id = {projectId}::integer` or `WHERE start_date = {startDate}::date`.

---

#### Step 2 — Parameters

Configure the parameters detected from your SQL query in Step 1.

For each `{parameterName}` found in the query, you define:

| Setting | Description |
|---|---|
| **Label** | The human-readable name shown to users on the run form |
| **Type** | The input type: text, number, date, boolean, or select |
| **Required** | Whether the user must supply a value before running |
| **Default value** | A pre-filled value shown when the run form opens |
| **Options** (select type only) | Either a static list of key/value pairs, or a SQL query that returns the list dynamically |

If your query has no parameters, Step 2 is skipped or shown as empty.

---

#### Step 3 — Metadata

Set the report's identity and access control:

| Field | Required | Notes |
|---|---|---|
| **Name** | Yes | Display name shown in the Reports hub and the Dynamic Reports list |
| **Description** | No | Short text shown on the report card and list |
| **Group** | No | Category label used to group the report in the hub (e.g., "Finance", "HR") |
| **Permission** | No | RBAC permission key that controls who can see and run this report. Leave blank to make it visible to all authenticated users |
| **Active** | Yes | Toggle to control whether the report appears in the Reports hub. Inactive reports are hidden from regular users but still accessible from the management list |

Click **Save** to create or update the report. You are returned to the Dynamic Reports list.

Click **Cancel** at any time to discard changes and return to the list.

---

## Part 5 — Frequently Asked Questions

**Q: I cannot see a report I expect to find in the hub.**
A: Reports are filtered by permission. If a report is not visible, you may not have the required permission assigned to your role. Contact your administrator. Also confirm the report has **Active** status — inactive reports are hidden from the hub.

---

**Q: The Export button downloads more rows than are shown on the current page. Is that intentional?**
A: Yes. The export always includes the full result set matching your current filters, regardless of the current page or rows-per-page setting. This lets you download all data without having to page through the grid.

---

**Q: I ran a dynamic report but got no results. What should I check?**
A: First, verify your parameter values — date ranges, employee selections, or other filters may be too narrow. Then try loosening the filters and re-running. If you still get no results and expect data to exist, contact the report's author or your administrator to review the underlying query.

---

**Q: The Run Report button is disabled. What do I need to do?**
A: Fill in all required parameters. Required parameters are marked on the form. The button becomes active once every required field has a value.

---

**Q: Can I edit a dynamic report while other users are running it?**
A: Yes, but edits take effect immediately on the next run. Any user currently viewing results from the old version will see those results until they re-run the report.

---

**Q: What happens if I set a dynamic report to Inactive?**
A: The report card disappears from the Reports hub for all users. The report is not deleted — it remains in the Dynamic Reports management list where you can reactivate it at any time.

---

**Q: Can I use subqueries or JOINs in a dynamic report's SQL?**
A: Yes. Any valid `SELECT` statement is supported, including subqueries, `JOIN`s, CTEs (`WITH` clauses), and aggregate functions. The only restriction is that the statement must be read-only — data-modification statements are rejected.

---

**Q: I defined a select-type parameter with a query, but the dropdown is empty when I run the report.**
A: The options query may be returning no rows, or it may have a syntax error. Open the report in the wizard, go to Step 2, and review the options query for that parameter. Run the options query directly in a database tool to confirm it returns data.

---

**Q: Can I duplicate an existing dynamic report to use as a starting point?**
A: There is no explicit duplicate function. Open the report you want to copy in the wizard, note the SQL, parameters, and metadata, then click **New Report** and re-enter those details for the new report.

---

## Summary Cheat Sheet

| I want to… | Where to go | Notes |
|---|---|---|
| Browse available reports | Reports (hub) | Only shows reports you have permission to view |
| Search for a specific report | Reports → search bar | Filters by report name and description |
| View time-off change history by employee | Reports → Time-Off Change Log → By Employee tab | Use the Employee filter to narrow results |
| View time-off change history by date | Reports → Time-Off Change Log → By Date Range tab | Set the date range filter |
| Export report results | Any report page → Export button | Downloads full result set as XLSX or CSV |
| Run a custom report | Reports hub → click a dynamic report card | Fill in required parameters, then click Run Report |
| Create a new dynamic report | Reports → Dynamic Reports → New Report | Requires Reports Admin permission |
| Edit an existing dynamic report | Reports → Dynamic Reports → Edit | Changes take effect on the next run |
| Deactivate a report | Reports → Dynamic Reports → Edit → set Active to off | Hides report from hub; does not delete it |
| View all dynamic reports (including inactive) | Reports → Dynamic Reports | Requires Reports Admin permission |

---

*For issues or questions not covered here, contact your HR representative or submit a support ticket through the internal helpdesk.*
