# Project Assignments — User Manual

> **Version 1.0 · March 2026**
> This manual covers the Project Assignments module. It is written for supervisors who manage team member allocations on client projects.

---

## What is Project Assignments?

Project Assignments is the module where supervisors manage which team members are working on each active project. From here you can add a team member to a project, update their billing rate when it changes, and remove them when their engagement ends. Every change is recorded in an audit trail, so the history of each assignment is always available.

---

## Key Concepts

Before using the module, familiarize yourself with the following terms.

**Assignment** — A record that links one team member to one project for a defined period. An assignment carries a billing rate, a currency, an allocation percentage, and optionally an end date and a client contact.

**Allocation** — The percentage of a team member's time dedicated to a specific project. A team member's total allocation across all active projects cannot exceed 100%.

**Bill Rate** — The hourly rate charged to the client for the team member's work. Expressed as a number paired with a currency code (e.g., 75 USD).

**Client Contact** — An optional reference to the client-side contact who is responsible for or associated with the team member's work on the project.

**Functional Area** — The discipline or practice area under which the team member's work on the project is categorized. The available options are filtered by the team member's country.

---

## Navigating the Page

Navigate to **Project Assignments** from the main menu.

[screenshot here]

The page has a single project selector at the top. You must select a project before any of the tabs become active. Once a project is selected, the table below populates with all current assignments for that project.

The page is organized into three tabs:

| Tab | Purpose |
|---|---|
| **Change Rate** | Update the billing rate for a team member already on the project |
| **Remove Team Member** | Set an end date to close an assignment |
| **Add Team Member** | Assign a new team member to the selected project |

All three tabs show the same assignment table. The only difference is which action button appears in the last column.

---

## The Assignment Table

Regardless of which tab you are on, the table displays the following columns for every active assignment on the selected project.

| Column | Description |
|---|---|
| Team Member | Full name of the assigned team member |
| Seniority | The team member's seniority level (e.g., Senior, Mid-Level) |
| Start Date | The date the assignment began |
| End Date | The date the assignment ends; displays a dash if the assignment is open-ended |
| Bill Rate | The hourly rate followed by the currency code (e.g., 75 USD) |
| Allocation | The percentage of the team member's time allocated to this project |
| Contact | The client contact linked to this assignment, if any |
| Actions | A tab-specific button (Change Rate, Remove, or no action for Add tab) |

The table shows only active assignments: those that have not been deleted and whose end date is today or in the future, or has no end date. You can sort any column by clicking its header. Pagination options of 10, 25, or 50 records per page are available at the bottom.

---

## Section 1 — Selecting a Project

The project selector at the top of the page drives everything else. It is a searchable dropdown that lists all active projects. Each entry displays the project name, its external identifier, and its SOW number.

1. Click the project selector.
2. Type part of the project name or ID to filter the list.
3. Select the project.

The URL updates automatically with the selected project ID, so you can bookmark or share a direct link to a specific project's assignments.

> If you navigate to the page and the table is empty with the message "Select a project to view its assignments," you have not yet selected a project.

---

## Section 2 — Adding a Team Member

[screenshot here]

Use the **Add Team Member** tab to assign a new team member to the selected project.

1. Select the project using the project selector at the top of the page.
2. Click the **Add Team Member** button. The button is disabled until a project is selected.
3. A dialog opens. Fill out the form fields described below.
4. Click **Save** to create the assignment.

### Form Fields

**Team Member** (required)

A searchable dropdown listing all team members who are under your supervisory hierarchy and are not already assigned to the selected project. Members who have already reached 100% total allocation are excluded from the list. When you select a team member, a badge appears showing their available allocation percentage.

**Start Date** (required)

The date the assignment begins. The date cannot fall on a Saturday or Sunday. The date cannot be in the past.

**End Date** (optional)

The date the assignment ends. If left blank, the assignment is treated as open-ended and will appear in the active view indefinitely. If provided, the end date must be after the start date.

**Hourly Rate** (required)

The billing rate for this assignment. Must be greater than zero. Accepts decimal values.

**Currency** (required)

A currency code of up to three characters (e.g., USD, EUR). The field pre-fills with the currency associated with the team member's country. The value is converted to uppercase automatically.

**Functional Area** (required)

A dropdown that becomes active only after you have selected a team member. The options are filtered to those relevant to the team member's country.

**Allocation %** (required)

The percentage of the team member's time to allocate to this project. Must be between 0.01 and the team member's available allocation. The available allocation is shown as a badge next to the team member field after selection. You cannot enter a value that would cause the team member's total allocation to exceed 100%.

**Contact** (optional)

A searchable dropdown listing active client contacts associated with the selected project's client. Linking a contact is optional and provides a reference for who on the client side is managing this team member's engagement.

### Validation Rules

The system enforces the following rules when you submit the form. If any rule is violated, you will see an error message explaining the problem.

---

**Rule 1 — No weekend start date**
The start date cannot be a Saturday or Sunday.

---

**Rule 2 — Team member must be your direct or indirect report**
You can only assign team members who are in your supervisory hierarchy. If a team member does not appear in the dropdown, they are either not under your supervision or are already fully allocated.

---

**Rule 3 — No duplicate active assignment**
A team member can only have one active assignment per project at a time. If the team member is already assigned to the selected project, the system will reject the submission.

---

**Rule 4 — Allocation cannot exceed available capacity**
The allocation you enter plus the team member's existing allocations across all projects cannot exceed 100%. The available allocation badge in the form shows you the maximum you can enter.

---

## Section 3 — Changing a Billing Rate

[screenshot here]

Use the **Change Rate** tab when a team member's billing rate is renegotiated. The system does not overwrite the existing rate. Instead, it closes the current assignment and creates a new one starting on the date you specify. This preserves the full history of rate changes.

1. Go to the **Change Rate** tab.
2. Find the team member whose rate is changing and click the **Change Rate** button in their row.
3. A dialog opens, labeled with the team member's name. Fill out the form.
4. Click **Save**.

### Form Fields

**New Start Date** (required)

The date on which the new rate takes effect. This date must be strictly after the current assignment's start date. The dialog displays the current start date for reference.

**New Bill Rate** (required)

The new hourly billing rate. Must be greater than zero.

**Currency** (required)

The currency for the new rate. Pre-fills with the current assignment's currency. Accepts up to three characters and is converted to uppercase automatically.

### What Happens Behind the Scenes

When you save a rate change, two things happen atomically:

1. The existing assignment is closed. Its end date is set to the day before the new start date you provided.
2. A new assignment is created starting on the new start date, using the new rate and currency. All other details (team member, project, allocation, original end date, contact) are carried over from the closed assignment.

Both operations are recorded in the audit trail. The table immediately reflects the new assignment with the updated rate.

---

## Section 4 — Removing a Team Member

[screenshot here]

Use the **Remove Team Member** tab to end a team member's assignment on the project. Removing an assignment sets its end date; it does not delete the record. The historical assignment data is preserved.

1. Go to the **Remove Team Member** tab.
2. Find the team member to remove and click the **Remove** button in their row.
3. A dialog opens, labeled with the team member's name. Enter an end date.
4. Click **Save**.

### Form Fields

**End Date** (required)

The date on which the team member's assignment ends. This date must be on or after the assignment's start date.

If you enter a date that is today or in the past, the system will display a warning:

> "The selected end date is in the past. This will immediately remove the team member from the active view."

This allows retroactive removals when the actual departure date has already passed. Confirm that the date is correct before saving.

### What Happens After You Save

The assignment's end date is set to the date you provided. If that date is today or earlier, the team member will no longer appear in the active assignment table immediately after you save. Their allocation percentage is freed up, making it available for future assignments on other projects.

---

## Section 5 — Allocation at a Glance

The system tracks how much of each team member's time is already committed across all active projects.

- When you open the **Add Team Member** dialog and select a team member, a badge next to the name field shows their **available allocation** — the percentage still uncommitted.
- If a team member's available allocation is 0%, they will not appear in the dropdown at all.
- After a team member is removed from a project or their assignment ends, their freed allocation becomes immediately available for new assignments.

Use this information to make confident decisions about capacity before creating new assignments.

---

## Section 6 — Frequently Asked Questions

**Q: A team member I expect to see is not showing up in the "Add Team Member" dropdown.**

A: There are three possible reasons: (1) the team member is not in your supervisory hierarchy, (2) they already have an active assignment on the selected project, or (3) their total allocation across all current projects is already at 100% and they have no capacity available.

---

**Q: I changed the rate but the old rate is still showing in the table.**

A: Refresh the page. The change rate operation closes the old assignment and creates a new one — the table should immediately reflect the new record after the dialog closes.

---

**Q: I need to correct the allocation percentage for an existing assignment. How do I do that?**

A: The allocation field is not editable directly from the table. To correct an allocation, use the **Remove** tab to close the current assignment with today as the end date, then use the **Add Team Member** tab to create a new assignment with the correct allocation starting today.

---

**Q: Can I assign the same team member to two different projects at the same time?**

A: Yes, as long as the combined allocation across all their active projects does not exceed 100%.

---

**Q: I removed a team member by mistake. Can I undo it?**

A: There is no undo. If the end date you set has not yet passed, the assignment is still visible in the table and no further action is needed — the team member will remain active until that date. If the end date is today or has already passed, the assignment has already been closed. Create a new assignment for the team member on the same project to reinstate them.

---

**Q: The project I need is not appearing in the project selector.**

A: Only active projects appear in the selector. If a project has been deactivated or does not yet exist in the system, it will not be available. Contact your administrator to verify the project's status.

---

**Q: What is the Client Contact field for?**

A: It is an optional field that links a client-side contact to the assignment. It indicates which person on the client's team is responsible for or associated with this team member's engagement on the project. Leaving it blank does not affect the assignment.

---

**Q: Can I set an end date when first adding a team member?**

A: Yes. The end date is optional in the Add dialog. If you know the engagement has a defined end date, enter it when creating the assignment. If the duration is uncertain, leave the field blank and use the Remove tab to close it when the time comes.

---

## Summary Cheat Sheet

| I want to... | Where to go | Notes |
|---|---|---|
| Assign a team member to a project | Add Team Member tab → Add Team Member button | Project must be selected; team member must be under your hierarchy and have available allocation |
| Update a billing rate | Change Rate tab → Change Rate button | Provide a new start date strictly after the current one; history is preserved |
| End a team member's assignment | Remove Team Member tab → Remove button | End date must be on or after the assignment start date; past dates are allowed with a warning |
| See all current assignments for a project | Select the project from the dropdown | All three tabs show the same assignment table |
| Check how much capacity a team member has | Open the Add dialog and select the team member | Available allocation badge appears next to the name field |

---

*For issues or questions not covered here, contact your administrator or submit a support ticket through the internal helpdesk.*
