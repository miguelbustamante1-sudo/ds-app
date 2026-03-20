# Holiday Swaps — User Manual

> **Version 1.0 · March 2026**
> This manual covers the Holiday Swaps module: how to request, review, and cancel holiday swap arrangements, and how approved swaps affect time-off planning.

---

## What is a Holiday Swap?

A holiday swap is an arrangement where an employee agrees to work on a public holiday in exchange for a personal day off on a different date. The employee chooses the replacement date, and the swap must be approved by their supervisor before it takes effect.

Once a swap is approved:
- The **original holiday date** becomes a regular working day for the employee — it can no longer be included in a time-off request.
- The **replacement date** becomes a personal holiday — it also cannot be included in a time-off request.

---

## Quick-Reference: Status Lifecycle

Every holiday swap has a status that tells you where it is in the approval process.

```
Submitted
    │
    ▼
[ Tentative ]  ◄── waiting for supervisor review
    │
    ├── Approve ──► [ Acknowledged ]  ──► (Cancel) ──► [ Cancelled ]
    │
    └── Reject ───► [ Rejected ]

[ Tentative ]  ──► (Cancel) ──► [ Cancelled ]
```

| Status | What it means | Who acts next |
|---|---|---|
| **Tentative** | The swap has been requested and is awaiting supervisor review | Supervisor |
| **Acknowledged** | The supervisor approved the swap; it is now active | Employee (can cancel if needed) |
| **Rejected** | The supervisor did not accept the swap | No further action required |
| **Cancelled** | The swap was cancelled by the employee | No further action required |

---

## Part 1 — My Holiday Swaps (Employee View)

### Where to find it

Navigate to **My Time Off → Holiday Swaps** from the main menu. This page lists all holiday swap requests you have submitted.

### 1.1 Reading the list

The table shows one row per swap request with the following columns:

| Column | Description |
|---|---|
| **Holiday** | The name of the public holiday being swapped |
| **Holiday Date** | The original public holiday date (the day you will work) |
| **Replacement Date** | The personal day off you will receive in return |
| **Status** | Current status: Tentative, Acknowledged, Rejected, or Cancelled |
| **Requested On** | The date the swap request was submitted |

Status badges are color-coded for quick scanning:
- **Green** — Acknowledged (approved and active)
- **Gray** — Tentative (pending review)
- **Red** — Rejected or Cancelled

### 1.2 Filtering by status

Use the status filter control above the table to show only swaps in a specific status.

### 1.3 Requesting a new swap

Click **Request Swap** in the top-right corner to open the swap request dialog (see Part 2).

### 1.4 Cancelling a swap

If a swap is in **Tentative** or **Acknowledged** status and the holiday date has not yet passed, a **Cancel** button appears on its row. Click it to open the cancellation dialog (see Part 3).

---

## Part 2 — Requesting a Holiday Swap

### Where to find it

Click **Request Swap** from the My Holiday Swaps page.

### 2.1 Filling out the request

| Field | Required | Notes |
|---|---|---|
| **Holiday** | Yes | Select a future public holiday from the list. Only holidays for your assigned country are shown. |
| **Replacement Date** | Yes | The date you want as your personal day off in exchange. |

### 2.2 Replacement date rules

The system enforces the following rules on the replacement date. The request will be blocked if any of these conditions are not met:

- Must be a future date.
- Must fall **after** the holiday date.
- Cannot be a weekend (Saturday or Sunday).
- Cannot be a public holiday.
- Cannot already be used as a replacement date in another active swap.
- Cannot fall within an existing active time-off request.

> If the holiday you want to swap is already covered by an active time-off request, that conflict must be resolved before the swap can be submitted.

### 2.3 Submitting

Click **Request** to submit. If any validation rule is not met, the form will display an error message explaining the issue.

Once submitted, the swap appears in your list with **Tentative** status, and your supervisor receives a notification to review it.

---

## Part 3 — Cancelling a Swap

### When cancellation is available

You can cancel a swap when:
- The swap is in **Tentative** or **Acknowledged** status.
- The original holiday date is still in the future.
- There are no active time-off requests covering the replacement date (for Acknowledged swaps) or the original holiday date.

> If you have a time-off request that conflicts with the cancellation, you must cancel or modify that time-off request first.

### 3.1 The cancellation dialog

Click **Cancel** on the swap row. A confirmation dialog opens with an optional **Comment** field. You may enter a reason for the cancellation, but it is not required.

Click **Confirm** to proceed. Click **Dismiss** to return without cancelling.

### 3.2 What happens after cancellation

- The swap status changes to **Cancelled**.
- If the swap was **Acknowledged**, the replacement date returns to being a regular working day and the original holiday is reinstated.
- If the swap was **Acknowledged**, your supervisor receives a notification.

---

## Part 4 — Reviewing Swaps (Supervisor View)

### Where to find it

Navigate to **My Team → [Employee] → Holiday Swaps**. This tab shows all swap requests submitted by the selected team member.

You will also receive an inbox notification each time one of your team members submits a new swap request.

### 4.1 Reading the team member's swap list

The table is identical in structure to the employee view (see Section 1.1). You can see all swaps for the selected team member, regardless of status.

### 4.2 Approving a swap

Swaps in **Tentative** status have an **Approve** button on their row. Click it to open the review dialog.

In the review dialog:
1. Review the holiday name, holiday date, and replacement date.
2. Optionally enter a **Comment**.
3. Click **Approve** to confirm.

Once approved:
- The swap status changes to **Acknowledged**.
- The swap becomes active: the replacement date is reserved and the original holiday becomes a working day.
- The employee receives a notification.

### 4.3 Rejecting a swap

In the review dialog, click **Reject** instead of Approve.

- The swap status changes to **Rejected**.
- No dates are affected.
- The employee receives a notification.

> You can only review swaps while the holiday date is still in the future. Swaps for past holidays cannot be approved or rejected.

### 4.4 Creating a swap on behalf of a team member

Click **Request Swap** from the team member's Holiday Swaps tab to submit a swap request on their behalf. The same validation rules apply.

---

## Part 5 — How Approved Swaps Affect Time Off

Once a swap is **Acknowledged**, two dates are treated differently in the time-off system:

| Date | Effect |
|---|---|
| **Original holiday date** | Becomes a working day. You cannot include it in a time-off request while the swap is active. |
| **Replacement date** | Becomes your personal holiday. You cannot include it in a time-off request either. |

If you try to submit a time-off request that overlaps with either of these dates, you will see one of the following errors:

- *"You have swapped [Holiday Name] and must work on [Date]. Please adjust your request dates."*
- *"Your replacement day [Date] is a personal holiday and cannot be included in a Time Off request."*

To resolve these conflicts, either adjust the time-off dates or cancel the swap.

---

## Part 6 — Frequently Asked Questions

**Q: I don't see the holiday I want to swap in the list. Why?**
A: Only future public holidays configured for your assigned country are shown. If you believe a holiday is missing, contact your HR administrator.

---

**Q: Can I swap a holiday that is today?**
A: No. The holiday date must be in the future. Today's date is not eligible.

---

**Q: Can I pick a weekend as my replacement date?**
A: No. Replacement dates must be weekdays. Weekends and public holidays are excluded.

---

**Q: Can I use a date that is already in an approved time-off request as my replacement date?**
A: No. The replacement date must be free of existing time-off requests. Cancel or modify the conflicting time-off request first.

---

**Q: My supervisor approved my swap, but now I need time off that includes my replacement date. What do I do?**
A: You must first cancel the swap. Once cancelled, the replacement date is no longer reserved and you can include it in a time-off request.

---

**Q: Can I have more than one active swap at the same time?**
A: Yes, as long as each swap involves a different holiday and a different replacement date. You cannot create a second swap for a holiday that already has an active (Tentative or Acknowledged) swap.

---

**Q: Can I cancel a swap after the holiday date has passed?**
A: No. Cancellation is only available while the original holiday date is still in the future.

---

**Q: My supervisor rejected my swap. Can I resubmit it?**
A: Yes. A rejected swap is closed, but you are free to submit a new swap request for the same holiday (as long as it is still in the future) with a different replacement date if needed.

---

**Q: I submitted a swap request by mistake. Can I undo it before my supervisor reviews it?**
A: Yes. You can cancel a swap in **Tentative** status before it is reviewed. Use the Cancel button on the swap row.

---

**Q: Does my supervisor receive a notification when I cancel an approved swap?**
A: Yes. If the swap was in **Acknowledged** status when cancelled, your supervisor is notified automatically.

---

## Summary Cheat Sheet

| I want to... | Where to go | Notes |
|---|---|---|
| View my swap requests | My Time Off → Holiday Swaps | — |
| Request a new swap | My Time Off → Holiday Swaps → Request Swap | Holiday must be in the future and in your country |
| Cancel a swap | My Time Off → Holiday Swaps → Cancel button | Only available for future swaps in Tentative or Acknowledged status |
| View a team member's swaps | My Team → [Employee] → Holiday Swaps | Supervisor only |
| Approve or reject a swap | My Team → [Employee] → Holiday Swaps → Approve button | Swap must be Tentative; holiday must still be in the future |
| Create a swap for a team member | My Team → [Employee] → Holiday Swaps → Request Swap | Supervisor only; same rules apply |

---

*For issues or questions not covered here, contact your HR representative or submit a support ticket through the internal helpdesk.*
