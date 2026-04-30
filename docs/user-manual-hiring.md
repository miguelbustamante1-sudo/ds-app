# Hiring — User Manual

> **Version 1.0 · March 2026**
> This manual covers the Hiring module: how to draft hiring records from approved endorsements, review candidate details, and execute hirings that automatically provision team members, project assignments, and projected vacations.

---

## What is a Hiring?

A hiring is a formal record that bridges an approved endorsement and the candidate's actual onboarding into the system. When a hiring is executed, it automatically creates a team member profile, one or more project assignments, and projected vacation days — all in a single atomic operation.

---

## Quick-Reference: Workflow Overview

```
Endorsement (Approved)
        │
        ▼
[ Ready to Draft ]  ◄── approved endorsements without a hiring record
        │
        │  Draft Hiring
        ▼
[ Pending Execution ]  ◄── hiring record created, waiting for execution
        │
        │  Execute
        ▼
[ Processed ]  ◄── team member, assignments, and vacations created
```

| Hiring Status | What it means | Who acts next |
|---|---|---|
| **Pending** | The hiring has been drafted and is awaiting execution | Team Leader |
| **Processed** | The hiring has been executed and all records have been created | No further action required |

---

## Part 1 — The Hiring List

### Where to find it

Navigate to **Hiring** from the main menu. The page has two tabs:

- **Ready to Draft** — lists approved endorsements that do not yet have a hiring record.
- **Pending Execution** — lists hiring records that have been drafted but not yet executed.

Each tab shows a count badge indicating how many records are available.

### 1.1 Ready to Draft tab

| Column | Description |
|---|---|
| **Candidate** | Full name of the candidate |
| **Project** | The project the candidate is assigned to |
| **Manager Email** | The client manager's email from the endorsement |

Click any row to open the Draft Hiring page for that endorsement.

### 1.2 Pending Execution tab

| Column | Description |
|---|---|
| **Candidate** | Full name of the candidate |
| **Project** | The project the candidate is assigned to |
| **Hiring Start Date** | The start date recorded on the hiring draft |
| **Workday ID** | The external HR system identifier (if already filled) |

Click any row to open the Execute Hiring page for that record.

### 1.3 Sorting and pagination

Both grids support column sorting. Use the rows-per-page selector at the bottom of each grid to display 5, 10, or 25 rows at a time.

---

## Part 2 — Drafting a Hiring

### Where to find it

Click any row in the **Ready to Draft** tab. This opens the Draft Hiring page for the selected endorsement.

### 2.1 What you see

The page is divided into two cards:

**Endorsement Information** — read-only view of all data from the source endorsement: candidate name, position, project, country, tier/band, billing rate, manager email, endorsement start date, status, and any associated bonus categories.

**Hiring Details** — the fields you fill out to draft the hiring record.

### 2.2 Hiring Details fields

Fields marked with an asterisk (*) are required.

| Field | Required | Notes |
|---|---|---|
| **Start Date** | Yes | The date the candidate officially begins. Changing this field auto-fills Billable Date with the same value if Billable Date has not been manually set |
| **Billable Date** | No | The date billing begins. Defaults to Start Date. Set this to a later date to create a non-billable ramp period |
| **Workday ID** | No | The external HR system identifier. Optional at draft time; required to execute later |
| **Currency Symbol** | No | Billing currency. Pre-filled from the endorsement's country |

> **Ramp periods:** If Billable Date is later than Start Date, two project assignments are created on execution — a non-billable period from Start Date to the day before Billable Date, and a billable period from Billable Date onward. If both dates are the same, a single billable assignment is created from day one.

### 2.3 Submitting

Click **Draft Hiring** to save the record. The hiring is created with **Pending** status and you are returned to the main Hiring list.

Click **Cancel** at any time to discard and return to the list without saving.

---

## Part 3 — Executing a Hiring

### Where to find it

Click any row in the **Pending Execution** tab. This opens the Execute Hiring page for the selected hiring record.

### 3.1 What you see

The page layout is the same as the Draft page: a read-only **Endorsement Information** card and an editable **Hiring Details** card. All fields from the draft are pre-filled and can be updated before executing.

### 3.2 The Workday ID requirement

**Workday ID is required to execute.** If it was left blank during drafting, you must fill it in here before the **Execute** button becomes active. The field displays the hint *"(required to execute)"*.

### 3.3 What execution does

When you click **Execute**, the system performs the following steps automatically in a single transaction:

1. **Creates a team member** using the candidate name, Workday ID, start date, country, and tier/band from the endorsement.

2. **Creates project assignment(s):**
   - If Start Date = Billable Date → one billable assignment starting on Start Date.
   - If Start Date < Billable Date → two assignments: a non-billable assignment for the ramp period, then a billable assignment from Billable Date onward.
   - Billing rate is taken from the endorsement; currency is resolved from the hiring record or the country default.

3. **Creates projected vacations** based on the candidate's country:

   | Country | Schedule |
   |---|---|
   | **El Salvador (SV)** | 15 vacation days at month 12 from Start Date |
   | **Guatemala (GT) or unknown country** | 5 days at month 4 · 5 days at month 8 · 5 days at month 12 |

   Vacation start dates are adjusted to the nearest Monday. All projected vacations are created with **Pending** status and marked as projected.

4. **Updates the hiring status** to **Processed** and records who executed it and when.

5. **Creates audit log entries** for each operation above.

> If any step in the transaction fails, none of the records are created and the hiring remains **Pending**. Audit log failures do not roll back the main operation.

### 3.4 Completing execution

After a successful execution the system navigates back to the Hiring list on the **Pending Execution** tab. The executed record will no longer appear there.

Click **Cancel** at any time to return to the list without executing.

---

## Part 4 — Bonus Categories

The Endorsement Information card on both the Draft and Execute pages displays a **Bonuses** section. Each bonus category from the linked endorsement is shown as a checked checkbox. These are informational only — they cannot be modified here. They indicate which bonus types the candidate is eligible for as recorded on the endorsement.

---

## Part 5 — Frequently Asked Questions

**Q: I cannot find an endorsement in the Ready to Draft tab.**
A: Only endorsements with **Approved** status that do not already have a hiring record appear in this tab. Check the Endorsements module to confirm the endorsement is approved. If a hiring record already exists, look in the Pending Execution tab.

---

**Q: The Billable Date changed when I updated the Start Date. Is that intentional?**
A: Yes. When Start Date is changed, Billable Date is automatically synchronized to match it — unless you have already manually set a different Billable Date. This ensures billing starts on day one by default. If you need a ramp period, manually set the Billable Date to a later date after choosing the Start Date.

---

**Q: The Execute button is disabled. What do I need to do?**
A: The Execute button requires the **Workday ID** field to be filled in. Enter the candidate's Workday ID and the button will become active.

---

**Q: How many project assignments will be created?**
A: This depends on the Start Date and Billable Date:
- If they are the same date, **one billable assignment** is created starting on that date.
- If Billable Date is after Start Date, **two assignments** are created: a non-billable assignment covering the ramp period, and a billable assignment starting on Billable Date.

---

**Q: What vacation days are created when I execute a hiring?**
A: Projected vacations are created automatically based on country. El Salvador candidates receive 15 days at the 12-month mark. Guatemala (and unknown country) candidates receive 5 days each at months 4, 8, and 12. All vacation start dates are adjusted to fall on a Monday.

---

**Q: Can I execute a hiring that has already been processed?**
A: No. Only hirings with **Pending** status can be executed. Once a hiring reaches **Processed** status, it cannot be re-executed.

---

**Q: I drafted a hiring with the wrong Start Date. Can I fix it before executing?**
A: Yes. Open the hiring from the Pending Execution tab and update the Start Date (and Billable Date if needed) on the Execute page before clicking Execute.

---

**Q: What happens if the execution fails?**
A: The entire operation is rolled back — no team member, project assignments, or projected vacations are created. The hiring record remains in **Pending** status and you can try again after resolving the issue. Common causes include a missing Workday ID, the current user not being registered as a team member, or the endorsement missing a tier/band or project.

---

**Q: The execution succeeded but I don't see audit log entries. Is something wrong?**
A: Audit log failures do not block execution. If the main operation succeeded (team member, assignments, and vacations were created), the hiring is complete. Audit log issues should be reported to your administrator.

---

## Summary Cheat Sheet

| I want to… | Where to go | Notes |
|---|---|---|
| View approved endorsements ready to hire | Hiring → Ready to Draft tab | Only shows endorsements without an existing hiring record |
| View hirings waiting to be executed | Hiring → Pending Execution tab | Only shows hirings with Pending status |
| Draft a new hiring | Hiring → Ready to Draft → click a row | Workday ID is optional at this stage |
| Execute a hiring | Hiring → Pending Execution → click a row | Workday ID is required to execute |
| Set up a non-billable ramp period | Draft or Execute page → set Billable Date after Start Date | Creates two project assignments automatically |
| Check what bonuses a candidate has | Draft or Execute page → Endorsement Information card | Read-only display of bonus categories |
| Fix fields before executing | Pending Execution → click row → update fields → Execute | All hiring detail fields are editable on the Execute page |

---

*For issues or questions not covered here, contact your HR representative or submit a support ticket through the internal helpdesk.*
