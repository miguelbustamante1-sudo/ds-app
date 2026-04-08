# Bench — User Manual

> **Version 1.0 · April 2026**
> This manual covers the two bench actions: **Bench Move** (moving a team member onto bench) and **End Bench** (returning a team member from bench). It also documents the Bench Move Detail page for reviewing historical records.

---

## What is a Bench Move?

A bench move is a formal action that transitions a team member off their active project assignments and into an internal bench allocation. When submitted, the operation simultaneously closes one or more project assignments, reassigns the team member's reporting hierarchy, and records a bench allocation with a functional area, percentage, and start date — all as a single operation.

Ending a bench period closes the active bench record and marks the team member as no longer on bench.

---

## Quick-Reference: Workflow Overview

```
Team Member (active on project)
        │
        │  Bench Move
        ▼
[ Active Bench Record ]  ◄── project assignments ended, supervisor updated, bench allocation created
        │
        │  End Bench
        ▼
[ Ended Bench Record ]  ◄── bench record closed, team member available for new assignments
```

| Bench Status | What it means |
|---|---|
| **Active** | The team member is currently on bench |
| **Ended** | The bench period has been closed |

---

## Part 1 — Bench Move

### Where to find it

Navigate to **Bench Move** from the main menu.

### 1.1 What you see

The page is divided into three sections that appear progressively as you fill in each step:

1. **Team Member selector** — choose who to bench.
2. **Project Assignments** card — review and set end dates for their active assignments.
3. Two side-by-side cards:
   - **Reporting Hierarchy** — select the new L1 supervisor and view the resulting L2/L3 chain.
   - **Bench Allocation** — configure the bench functional area, allocation percentage, and start date.

### 1.2 Selecting a team member

The team member dropdown is populated with your **direct reports** only. Use the search box to find by name. Selecting a team member triggers three parallel data loads:

- Active project assignments for that team member.
- The list of all available supervisors.
- The team member's current supervisor chain (used to pre-fill L1).

While data is loading, skeleton placeholders are shown in place of the cards below.

### 1.3 Project Assignments card

| Column | Description |
|---|---|
| **Project Name** | Name of the active project |
| **Client** | Client associated with the project |
| **Allocation** | The team member's current allocation percentage on this project |
| **Start Date** | The assignment's start date |
| **End Date** | Editable date field — set when this assignment should end |

End dates default to **today** when the team member is selected. Rows highlighted in yellow indicate assignments whose end date is still in the future (i.e., the team member is still considered active on that project).

> **Validation rule:** At least one project assignment must have an end date of today or earlier. The team member must be freed from at least one active project before the bench move can be submitted.

If the team member has no active project assignments, a message is shown and you may proceed with only the hierarchy and allocation changes.

### 1.4 Reporting Hierarchy card

| Field | Description |
|---|---|
| **L1 — Direct Supervisor** | Searchable dropdown to select the team member's new direct supervisor. Pre-filled with their current L1 |
| **L2 — Supervisor's Supervisor** | Read-only. Resolved automatically from the selected L1's chain |
| **L3** | Read-only. Resolved automatically from the selected L1's chain |

When you change the L1 selection, the system fetches the new L2 and L3 values automatically (with a brief debounce). The L2 and L3 fields update to reflect the full chain under the new supervisor.

### 1.5 Bench Allocation card

Fields marked with an asterisk (*) are required.

| Field | Required | Notes |
|---|---|---|
| **Functional Area** | Yes | The internal area the team member will be allocated to while on bench (e.g. Training, Internal Projects) |
| **Allocation** | Yes | A decimal value from 0.01 to 1.00 representing the bench allocation fraction (1.00 = 100%) |
| **Start Date** | Yes | The date the bench allocation begins. Defaults to today |

### 1.6 Submitting

Click **Submit Bench Move** to validate the form. If any required field is missing or invalid, a validation error message appears below the cards. Correct the highlighted issue and try again.

If validation passes, a confirmation dialog appears:

> *"You are about to bench [Name]. This will update their project assignments, supervisor, and allocation. Continue?"*

Click **Confirm Bench Move** to submit. Click **Cancel** to go back without submitting.

On success, you are navigated automatically to the **Bench Move Detail** page for the newly created record.

### 1.7 Validation rules summary

| Rule | Error message shown |
|---|---|
| No team member selected | Please select a team member. |
| No L1 supervisor selected | Please select a supervisor (L1). |
| No functional area selected | Please select a functional area. |
| Allocation out of range or blank | Allocation must be between 0.01 and 1.00. |
| No start date set | Please set a start date. |
| Any project assignment missing an end date | All project assignments must have an end date. |
| No project ends today or earlier | At least one project must end today or earlier. The team member must be freed from at least one active project before moving to bench. |

### 1.8 What the submission does

When confirmed, the system sends a single request that performs the following:

1. **Ends project assignments** — sets the end date on each listed assignment to the date you specified.
2. **Updates the reporting hierarchy** — records the new L1 supervisor for the team member.
3. **Creates a bench record** — stores the functional area, allocation fraction, and start date.

On success, you are redirected to the Bench Move Detail page for the record just created.

---

## Part 2 — End Bench

### Where to find it

Navigate to **End Bench** from the main menu.

### 2.1 What you see

The page is divided into two sections that appear progressively:

1. **Team Member selector** — choose who to return from bench.
2. **Active Bench Record** card — read-only summary of the team member's current bench situation.
3. **End Date** field — the date the bench period closes.

### 2.2 Selecting a team member

The dropdown is populated with your **direct reports** only. When a team member is selected, the system looks up their active bench record. Three outcomes are possible:

| Outcome | What is shown |
|---|---|
| Active bench record found | The bench record card and End Date field are displayed |
| No active bench record | A message: *"No active bench record found for this team member."* The **End Bench** button is disabled |
| Load error | An error message is shown. The **End Bench** button is disabled |

### 2.3 Active Bench Record card (read-only)

| Field | Description |
|---|---|
| **Supervisor** | The team member's current supervisor while on bench |
| **Functional Area** | The functional area assigned during the bench move |
| **Allocation** | The bench allocation percentage |
| **Start Date** | The date the bench period began |

### 2.4 End Date field

Set the date the bench period ends. The field enforces a minimum value equal to the bench record's start date — you cannot end a bench period before it began. Defaults to today.

### 2.5 Submitting

Click **End Bench** to validate and open the confirmation dialog:

> *"You are about to end the bench period for [Name]. Their bench record will be closed as of [End Date]. Continue?"*

Click **Confirm** to submit. Click **Cancel** to go back without submitting.

On success, a toast notification confirms the action and the form resets to its initial state, ready for another team member.

### 2.6 Validation rules summary

| Rule | Error message shown |
|---|---|
| End date is blank | Please set an end date. |
| End date is before the bench start date | End date must be on or after the bench start date. |

### 2.7 What the submission does

The system patches the active bench record with the specified end date, marking it as **Ended**. The team member is no longer considered on bench after this operation.

---

## Part 3 — Bench Move Detail

### Where to find it

You are redirected here automatically after a successful Bench Move submission. You can also navigate here directly from any screen that links to a bench record (e.g., a team member's profile).

The page title shows **Bench Move #[ID]** and the team member's name as a subtitle. A back button returns you to the previous page (or to the Bench Move list if no return path is set).

### 3.1 What you see

Two side-by-side cards:

**Bench Details**

| Field | Description |
|---|---|
| **Team Member** | Full name of the team member who was benched |
| **Supervisor** | The supervisor assigned at the time of the bench move |
| **Start Date** | The bench period start date |
| **End Date** | The bench period end date, or — if still active |

**Status**

| Field | Description |
|---|---|
| **Status** | Badge showing **Active** (bench period is open) or **Ended** (bench period has been closed) |
| **Functional Area** | The internal area the team member was allocated to |
| **Allocation** | Bench allocation as a percentage (e.g., 100%) |
| **Created By** | The user who submitted the bench move |
| **Created At** | Date the bench move record was created |

---

## Part 4 — Frequently Asked Questions

**Q: I cannot find a team member in the Bench Move or End Bench dropdown.**
A: Both dropdowns show only your **direct reports**. If the team member reports to someone else in your chain, ask their direct supervisor to perform the action.

---

**Q: The Submit Bench Move button is disabled after I select a team member.**
A: The button remains disabled while the team member's data is still loading. Wait for the project assignment and hierarchy cards to appear.

---

**Q: All my project end dates default to today. Do I have to change them?**
A: Not necessarily. Defaulting to today means all assignments end today, which satisfies the validation rule. Change an end date to a future date only if you want to keep that assignment active for a defined period. Note: any assignment with a future end date will appear highlighted in yellow as a reminder.

---

**Q: The validation says "at least one project must end today or earlier" but I want to move the team member to bench starting next week.**
A: The bench start date (in the Bench Allocation card) is independent of the project end dates. You can set a future bench start date while still ending at least one project today. The rule only requires that at least one assignment is closed now so the team member is freed from their current work.

---

**Q: The L2 and L3 fields didn't update after I changed the supervisor.**
A: There is a brief delay while the system resolves the new supervisor's chain. If the fields show dashes after a few seconds, the selected supervisor may not have a configured chain above them. You can proceed — L2 and L3 are informational and do not block submission.

---

**Q: I selected a team member on the End Bench page but no bench record appeared.**
A: The team member does not have an active bench record. Either they were never benched, or their bench period has already been ended. The **End Bench** button will be disabled in this state.

---

**Q: The End Date field won't let me pick a date before the bench start date.**
A: This is by design. A bench period cannot end before it began. Check the **Start Date** shown in the Active Bench Record card and choose an end date on or after that date.

---

**Q: Can I undo a bench move?**
A: There is no direct undo. To correct a bench move submitted in error, contact your administrator to reverse the project assignment end dates and remove the bench record manually.

---

**Q: After ending a bench period, can I start a new one for the same person?**
A: Yes. Once a bench record is ended, that team member can be benched again via a new Bench Move.

---

## Summary Cheat Sheet

| I want to… | Where to go | Notes |
|---|---|---|
| Move a team member to bench | Bench Move → select team member → fill in all sections → Submit | At least one project must end today or earlier |
| Return a team member from bench | End Bench → select team member → set end date → End Bench | Team member must have an active bench record |
| Review a bench record | Bench Move Detail page | Accessible via direct link or after a successful bench move |
| Set a non-100% bench allocation | Bench Move → Bench Allocation card → set Allocation to a value < 1.00 | Use decimal notation: 0.50 = 50% |
| Keep one project active past today | Bench Move → Project Assignments → set that row's end date to a future date | The row will highlight in yellow as a reminder |
| Check who submitted a bench move | Bench Move Detail → Status card → Created By | Also shows the creation date |

---

*For issues or questions not covered here, contact your HR representative or submit a support ticket through the internal helpdesk.*
