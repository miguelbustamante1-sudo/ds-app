# Supervisor Time Off — User Manual

> **Version 1.0 · April 2026**
> This manual covers the two supervisor-facing Time Off pages: **Supervisor Time Off** and **Time Off Review**. It also explains how to handle exceptions and how to report bugs.

---

## Status Reference

| Status | Meaning |
|---|---|
| **Tentative** | Request has been created and is awaiting confirmation |
| **Acknowledged** | Request has been confirmed — days are counted on the calendar |
| **Rejected** | Request was declined |
| **Cancelled** | Request is void; days return to the balance |

All status changes are made from the **Time Off Review** page.

---

## Part 1 — Supervisor Time Off

### Where to find it

Navigate to **Actions → Supervisor Time Off** from the main menu.

---

### 1.1 Selecting a team member

When you open the page you will see a list of your direct reports on the left. Click a name to load that person's workspace.

Once a team member is selected, the header shows their full name, Workday ID, and balance badges. The badges displayed depend on the team member's country:

| Country | Badges shown |
|---|---|
| Mexico (MX) | Time Off Days |
| Guatemala (GT) | Vacation Days · Exception Days (remaining / 5) |
| All others (e.g. El Salvador) | Vacation Days · Personal Days |

---

### 1.2 New Time Off Request form

After selecting a team member, a **New Time Off Request** form appears. It resets automatically whenever you switch to a different team member.

**Fields:**

| Field | Required | Notes |
|---|---|---|
| **Category** | Yes | Filtered by the team member's country |
| **Start Date** | Yes | Past dates, weekends, public holidays, and dates beyond the team member's end date are disabled in the calendar |
| **End Date** | Yes | Disabled for fixed-duration categories and for El Salvador Vacation (auto-set to 15 days from start) |
| **Comment** | Yes | Free text; required to submit |

---

### 1.3 Validations

**Blocking — the form will not submit:**

| Condition | Alert shown |
|---|---|
| Dates overlap with an existing request | Lists the conflicting requests |
| Start date falls on a weekend | "Start date cannot be on a weekend" |
| Start date falls on a public holiday | "Start date cannot be on a public holiday" |
| Dates extend beyond the team member's end date | Attrition date alert |
| El Salvador Vacation: 15-day annual limit already reached | SV vacation policy alert |
| Request exceeds the category's maximum days per request | Max days exceeded alert |

**Advisory — shown as warnings but do not block submission:**

| Condition | Notes |
|---|---|
| Insufficient advance notice | The category requires more lead time; supervisors can submit anyway |
| Insufficient balance | Balance warning shown; supervisors can still create the request |
| Guatemala: request is under 5 days (counts as an exception day) | Shows exception days remaining |
| Guatemala: exception days remaining are not enough for the request | Shown as a destructive alert |

---

### 1.4 Holiday awareness

When the selected date range contains public holidays, the form displays an informational alert:

- **El Salvador:** holidays within the range will be counted as vacation days.
- **Guatemala:** holidays within the range will not be counted as vacation days; the alert shows the net vacation days that will be used.

Public holidays are highlighted in amber on the calendar picker.

---

### 1.5 El Salvador Vacation — split mode

When the team member is from El Salvador and the Vacation category is selected:

- The **End Date is auto-set** to 15 calendar days from the start date and cannot be changed manually.
- Two buttons appear: **Create Time Off Request** and **Split**.
- Clicking **Split** enters split mode, which lets you divide the 15 days into two separate sub-requests. In split mode you set the end date of the first period and a start date for the second period; the end date of the second period is calculated automatically based on remaining days.
- Clicking **Back** in split mode returns to the regular form.

---

### 1.6 Time Off Requests table

Below the form, a table shows all time-off requests for the selected team member.

**Columns:** Category · Start Date · End Date · Days · Status · Changes

**Controls above the table:**

| Control | Description |
|---|---|
| Search | Free-text filter across all table rows |
| Show past | Include requests whose end date has already passed (hidden by default) |
| Show cancelled | Include requests in Cancelled status (hidden by default) |
| Show split | Include individual sub-requests created by the El Salvador split (hidden by default) |

**Row actions:**

- **Edit** — available for requests that are not Cancelled or Rejected and whose start date has not yet passed. Opens an edit dialog.
- **Cancel** — available for any request that is not already Cancelled. Opens a cancel dialog.

**Row click** — clicking anywhere on a row (not on an action button) toggles a **Detail Panel** below the table. Clicking the same row again closes the panel.

---

### 1.7 Detail Panel

When a row is selected, the Detail Panel appears below the table with four sections:

**Request Details**
- Category
- Start Date
- End Date
- Days
- Comment (shown only if one was entered at creation)

**Status**
- Team Member name
- Current Status (color-coded badge)

**Actions** (shown only when the request can be cancelled)
- **Cancel Request** button — opens a dialog that requires a mandatory cancellation reason. The dialog has two buttons: **Keep Request** and **Cancel Request**.

**Changelog** (shown only when there are entries)
- Chronological list of every change, showing the comment, the user who made the change, and the date and time.

---

### 1.8 Editing a request

1. Click **Edit** on a row in the table.
2. Update the fields in the dialog.
3. Click **Save Changes**.

---

### 1.9 Cancelling a request from the table

1. Click **Cancel** on a row in the table.
2. Enter a mandatory comment in the dialog.
3. Click **Confirm Cancel**.

The request moves to Cancelled status and the days are returned to the team member's balance.

---

## Part 2 — Time Off Review

### Where to find it

Navigate to **Actions → Time Off Review** from the main menu.

This page shows time-off requests across your entire organizational scope and is where all status changes are made.

---

### 2.1 The management grid

**Columns:** WDID · Team Member · Report Level · Category · Start Date · End Date · Days · Status · Changes

Requests are sorted by start date (most recent first) by default. Click any column header to re-sort.

---

### 2.2 Filtering

| Filter | Type | Behavior |
|---|---|---|
| **WDID** | Text input | Shows rows where the Workday ID contains the typed text |
| **Team Member** | Text input | Shows rows where the full name contains the typed text |
| **Category** | Multi-select dropdown | Shows only the selected categories |
| **Status** | Multi-select dropdown | Shows only the selected statuses |
| **Report Level** | Multi-select dropdown | Shows only the selected report levels |
| **Show all cancelled** | Checkbox (top of page) | When unchecked (default), Cancelled requests are hidden |

A **Reset** button appears whenever any column filter is active. Clicking it clears all column filters at once. The **Show all cancelled** checkbox is independent and is not reset by this button.

---

### 2.3 Editing a request

1. Click the **Edit** button on a row.
2. Update the fields in the dialog.
3. Click **Save Changes**.

Available only for requests that are not Cancelled or Rejected and whose start date has not yet passed.

---

### 2.4 Cancelling a request

1. Click the **Cancel** button on a row.
2. Enter a mandatory comment.
3. Click **Confirm Cancel**.

---

### 2.5 Viewing full request details

Click anywhere on a row (not on an action button) to navigate to the full detail view for that request, which includes its complete changelog. Use the back button or breadcrumb to return to the review grid.

---

## Part 3 — Managing Exceptions

An exception is a scenario that cannot be handled through the normal pages — for example, a retroactive correction or a balance adjustment.

### How to request an exception

Send an email to:

- **Milton Ayala**
- **Miguel Bustamante**

Use exactly the following format:

---

**Subject:**
```
Timeoff Exception | {TeamMemberName} {WorkDayID}
```

**Body:**
- A clear summary of the changes required.
- An image or screenshot of the justification document.
- A note indicating **when and how the team member was notified** of the situation.

---

Requests that do not follow this format may be delayed. Include all information in the initial message to avoid back-and-forth.

---

## Part 4 — Reporting Bugs

If you encounter unexpected behavior anywhere in the application, use the bug reporting form:

**Bug Report Form:** https://forms.monday.com/forms/5bf6f981f7dd8356c9ef24b4be40b97f?r=use1

When filling out the form, include:

- The page or feature where the issue occurred.
- What you expected to happen and what actually happened.
- Screenshots or recordings if available.
- The date and time when the issue was observed.
