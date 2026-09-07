# Endorsements — User Manual

> **Version 1.0 · March 2026**
> This manual covers the Endorsements module: how to create, review, edit, and resolve endorsement records, including the bonus compensation attached to each one.

---

## What is an Endorsement?

An endorsement is a formal record that captures a candidate's placement on a client project, along with any compensation bonuses that apply. It links a candidate to a specific client, project, and country, and goes through an approval workflow before it is considered final.

---

## Quick-Reference: Status Lifecycle

Every endorsement has a status that tells you where it is in the approval process.

```
Created
    │
    ▼
[ Pending ]  ◄── waiting for review and approval
    │
    ├── Approve ──► [ Approved ]
    │
    └── Reject ───► [ Rejected ]
```

| Status | What it means | Who acts next |
|---|---|---|
| **Pending** | The endorsement has been created and is awaiting a decision | Reviewer |
| **Approved** | The endorsement has been accepted | No further action required |
| **Rejected** | The endorsement was not accepted | No further action required |

> The status can also be changed directly at any time using the status dropdown on the detail page — not only through the Approve button.

---

## Part 1 — The Endorsements List

### Where to find it

Navigate to **Endorsements** from the main menu. This is the main view showing all endorsements you have access to.

### 1.1 Reading the list

The list shows one row per endorsement with the following columns:

| Column | Description |
|---|---|
| **Candidate** | Full name of the candidate being endorsed |
| **Position** | The role or job title of the candidate |
| **Project** | The client project the candidate is assigned to |
| **Start Date** | When the candidate is expected to start |
| **Status** | Current status: Pending, Approved, or Rejected |

Columns can be sorted, resized, and reordered. Use the column visibility control to hide columns you do not need.

### 1.2 Searching

Use the search bar at the top of the list to filter by candidate name, position, or project. The filter applies across all visible text columns in real time.

### 1.3 Opening an endorsement

Click any row to open the endorsement detail page.

### 1.4 Creating a new endorsement

Click **New Endorsement** in the top-right corner. This takes you to the creation form (see Part 2).

---

## Part 2 — Creating an Endorsement

### Where to find it

Click **New Endorsement** from the Endorsements list, or navigate directly to **Endorsements → New Endorsement**.

### 2.1 General Information

Fill out the following fields. Fields marked with an asterisk (*) are required.

| Field | Required | Notes |
|---|---|---|
| **Candidate First Name** | Yes | — |
| **Candidate Last Name** | Yes | — |
| **Candidate Position** | Yes | The role or title for this placement |
| **Client** | Yes | Select from the list of active clients |
| **Project** | Yes | Filtered to projects that belong to the selected client. You must select a client before a project can be chosen |
| **Client Manager Email** | Yes | Must be a valid email address. The field may suggest addresses associated with the selected client |
| **Country** | Yes | Determines which bonus types are available. **Cannot be changed after the endorsement is saved** |
| **Start Date** | Yes | Defaults to today |
| **Tier/Band** | No | Optional compensation tier or band for the candidate |
| **Billing Rate** | No | Numeric rate; enter a decimal value such as 50.00 |
| **Comment** | No | Free-text field for any notes or context |

> **Project resets when you change the Client.** If you select a client and then change it, the project field clears automatically. Choose the client first, then the project.

### 2.2 Adding bonuses

The Bonus Selection panel appears below the general information fields. **You must select a Country first** — bonus types are filtered by country, and the panel will remain inactive until a country is chosen.

[screenshot here]

To add a bonus:

1. Select a **Bonus** type from the dropdown. Only bonus types available for the selected country are shown. Each type can only be added once per endorsement.
2. Review or adjust the **Amount**. Many bonus types have a default amount that is pre-filled automatically — you can change it.
3. If the selected bonus type has additional required fields (such as dates or other metadata), they appear below the amount field. Fill them in. Two automatic behaviors apply to date metadata fields:
   - A field whose name contains "start date" is pre-filled with the endorsement's **Start Date** automatically.
   - An **end date** field is calculated as the anchor start date + 9 months and updates automatically whenever the anchor date changes. You can override the value manually.
4. Optionally enter a **Comments** note specific to this bonus.
5. Click **Add Bonus**.

The bonus is added to the summary table below. Repeat for each additional bonus.

> If you change the **Country** after adding bonuses, all bonuses are cleared. Country selection determines which bonus catalog applies.

### 2.3 The bonus summary table

As you add bonuses, they appear in a table showing the bonus name, category, amount, any metadata, and notes. To remove a bonus before saving, click the remove (×) button on its row.

### 2.4 Submitting

When all required fields are filled and your bonuses are configured, click **Create Endorsement**. If any required field is missing, the form will highlight the problem and prevent submission.

Click **Cancel** at any time to discard the form and return to the list without saving.

---

## Part 3 — Viewing an Endorsement

### 3.1 What you see on the detail page

The detail page is divided into two cards:

**General Information** — displays all fields entered at creation: candidate name, position, client manager email, project, country, start date, tier/band, billing rate, and comment.

**Bonuses** — a table listing every bonus attached to this endorsement, with columns for Bonus name, Amount, Details (metadata), and Notes (comments).

### 3.2 The status dropdown

The current status (**Pending**, **Approved**, or **Rejected**) is displayed as a dropdown in the toolbar. You can change the status directly by selecting a new value from this dropdown at any time.

### 3.3 The Approve button

When an endorsement is in **Pending** status, an **Approve** button appears in the toolbar alongside the status dropdown.

Clicking **Approve** opens a confirmation dialog. You must enter an **Approval Comment** before the action can be completed. Once approved:

- The status changes to **Approved**.
- The comment is saved with the endorsement.
- The Approve button disappears.

> The Approve button is a shortcut. You can also approve by selecting "Approved" directly from the status dropdown, though the dropdown does not require a comment.

---

## Part 4 — Editing an Endorsement

### 4.1 Entering edit mode

Click **Edit** in the toolbar on the detail page. The page switches to edit mode: all editable fields become interactive inputs, and the bonus table gains edit and delete controls.

While in edit mode, the toolbar shows **Cancel** and **Save Changes** instead of the Edit button.

### 4.2 What you can edit

| Field | Editable? | Notes |
|---|---|---|
| Candidate First Name | Yes | — |
| Candidate Last Name | Yes | — |
| Candidate Position | Yes | — |
| Client Manager Email | Yes | Must remain a valid email |
| Project | Yes | Can switch to any project in the system |
| Country | **No** | Fixed at creation — never editable |
| Start Date | Yes | — |
| Tier/Band | Yes | — |
| Billing Rate | Yes | — |
| Comment | Yes | — |

> **Country is immutable.** Once an endorsement is created, its country cannot be changed. This is intentional because country determines which bonus types are available.

### 4.3 Editing bonuses in edit mode

While in edit mode, the bonus table shows additional controls on each row:

- **Edit (pencil icon)** — Expands that row into an inline edit form. You can update the amount, metadata fields, and comments. Click **Save** on the row to apply, or **Cancel** to discard.
- **Delete (trash icon)** — Prompts a confirmation dialog. Confirm to permanently remove the bonus from this endorsement.

A new **Add Bonus** panel also appears below the table. It works exactly like the bonus panel in the creation form (see Section 2.2), and bonuses added here are saved immediately to the server when you click **Add Bonus**.

### 4.4 Saving or cancelling

Click **Save Changes** to persist all general-information edits. Click **Cancel** to discard changes and return to view mode. Individual bonus edits and additions are saved independently as you go.

---

## Part 5 — Frequently Asked Questions

**Q: I selected a client but the Project dropdown is empty. Why?**
A: The project list is filtered to projects that belong to the selected client. If no projects appear, the client may not have any active projects configured in the system. Contact your administrator.

---

**Q: I cannot find the bonus type I need in the Bonus dropdown.**
A: Bonus types are filtered by the country you selected. If a bonus you expect to see is missing, it may not be configured for that country. Verify the country is correct, then contact your administrator if the bonus type should be available.

---

**Q: I added a bonus and then changed the country. My bonuses disappeared.**
A: Changing the country resets the bonus selection because different countries have different bonus catalogs. Re-select the correct country and re-add your bonuses.

---

**Q: The Project field reset when I changed the Client. Is that a bug?**
A: No, this is intentional. Projects belong to a specific client, so when you change the client the previously selected project is no longer valid. Choose the new client first, then select the appropriate project.

---

**Q: Can I change the country of an existing endorsement?**
A: No. Country is fixed at creation and cannot be edited afterward. If the wrong country was selected, you will need to create a new endorsement with the correct country.

---

**Q: What is the difference between using the Approve button and changing the status to "Approved" in the dropdown?**
A: The **Approve** button opens a dialog that requires you to enter an approval comment before confirming. Changing the status via the dropdown applies the change immediately without prompting for a comment. Use the Approve button when you want to record a comment as part of the approval.

---

**Q: Can I move an Approved endorsement back to Pending?**
A: Yes. The status dropdown allows you to select any status at any time, including moving from Approved or Rejected back to Pending.

---

**Q: I deleted a bonus by mistake. Can I undo it?**
A: No. Bonus deletion is permanent and cannot be undone. You can re-add the bonus by going back into Edit mode and using the Add Bonus panel.

---

**Q: The Save Changes button is saving my general-information edits, but I also added a bonus. Did the bonus save too?**
A: Yes. Bonus additions (via the Add Bonus panel in edit mode) are saved to the server immediately when you click Add Bonus — independently of the Save Changes button, which only covers the general-information fields.

---

## Summary Cheat Sheet

| I want to... | Where to go | Notes |
|---|---|---|
| View all endorsements | Endorsements (main list) | — |
| Search for a specific endorsement | Endorsements → search bar | Filters by candidate name, position, project |
| Create an endorsement | Endorsements → New Endorsement | Country required before adding bonuses |
| View an endorsement's details | Click any row in the list | — |
| Approve an endorsement | Detail page → Approve button | Requires an approval comment; only visible when status is Pending |
| Change the status | Detail page → status dropdown | Can set Pending, Approved, or Rejected at any time |
| Edit endorsement fields | Detail page → Edit → Save Changes | Country is never editable |
| Add a bonus to an existing endorsement | Detail page → Edit → Add Bonus panel | Saved immediately on Add Bonus click |
| Edit a bonus | Detail page → Edit → pencil icon on bonus row | Saved per-row |
| Delete a bonus | Detail page → Edit → trash icon on bonus row | Permanent; cannot be undone |

---

*For issues or questions not covered here, contact your HR representative or submit a support ticket through the internal helpdesk.*
