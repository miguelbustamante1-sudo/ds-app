# Time Off — User Manual

> **Version 1.0 · March 2026**
> This manual covers the Time Off module from two perspectives: **Team Member** and **Supervisor**. Read the section that applies to you, or both if you hold both roles.

---

## What is a Time Off request?

A time-off request is how you formally communicate to your team and supervisor that you will not be working on specific days. Every absence — vacation, personal day, sick leave, or any other approved category — must go through this module so that balances, calendars, and notifications stay accurate for everyone.

---

## Quick-Reference: Status Lifecycle

Every request moves through a defined set of states. Understanding these states tells you exactly what needs to happen next.

```
Created by supervisor
        │
        ▼
  [ Tentative ]  ◄── waiting for your acknowledgment
        │
        ├── You ACKNOWLEDGE it ──► [ Acknowledged ]  ──► can still be Cancelled
        │
        └── You DECLINE it ──────► [ Rejected ]  ──────► can be Cancelled by supervisor
        │
        └── Cancelled any time ──► [ Cancelled ]  (terminal — nothing else happens)
```

| Status | What it means | Who acts next |
|---|---|---|
| **Tentative** | Request exists, waiting for you to confirm or reject | You (the team member) |
| **Acknowledged** | You accepted it — it's on the calendar | Either party can cancel |
| **Rejected** | You declined it | Supervisor decides whether to cancel |
| **Cancelled** | The request is void — days return to your balance | No further action needed |

---

## Part 1 — Team Member: My Time Off

### Where to find it

Navigate to **Time Off → My Time Off** from the main menu. This is your personal workspace: you see only your own requests.

### 1.1 Checking your available days

Before you request anything, check your balance. On the My Time Off page you will see cards showing:

- **Vacation days available**
- **Personal days available**

These numbers come directly from Workday and reflect your current balance after all active (non-cancelled) requests are counted. The balance **decreases** when a request is created and **returns** when a request is cancelled.

> You cannot request more days than your current balance allows.

### 1.2 Creating a request

[screenshot here]

1. On the My Time Off page, fill out the request form.
2. Choose the **category** that matches your absence (Vacation, Personal Day, etc.). The categories available depend on your country.
3. Select a **start date** and an **end date**.
4. Submit the request.

The system immediately validates several rules (see Section 1.4). If any rule is violated, you will see an error message explaining why.

Once accepted, the request is created with status **Tentative**. Your balance is deducted right away.

### 1.3 What happens after you submit

1. Your supervisor receives a notification informing them of the new request.
2. The request appears on your list with status **Tentative**.
3. No further action is needed from you at this point — the ball is in your supervisor's court to communicate the decision, but the request is already registered.

> **Note:** When a supervisor creates a request *on your behalf*, the flow is slightly different — you will receive a notification asking you to acknowledge or decline. See Section 1.5 for details.

### 1.4 Rules you must follow when requesting

The system enforces the following rules automatically. Knowing them in advance will save you time.

---

**Rule 1 — No weekend start**
Your request cannot start on a Saturday or Sunday. If you need days that include a weekend, your start date must be the Monday after (or the Friday before, if applicable).

---

**Rule 2 — Advance notice requirement**
Each category has a minimum number of days you must request *before* the start date. For example, if the requirement is 5 days, you cannot request a vacation that starts in 3 days. The exact number varies by category and country — check with your supervisor if you are unsure.

---

**Rule 3 — No overlapping requests**
You cannot have two active requests covering the same dates. Cancelled requests do not count as active.

---

**Rule 4 — Sufficient balance**
Your vacation and personal day requests are checked against your Workday balance. If you do not have enough days, the request will be rejected.

---

**Rule 5 — Respect your end date**
If your employment has a contractual end date in the system, you cannot create a request that extends beyond that date.

---

**Rule 6 — Holidays are counted**
The system is aware of public holidays in your country. Depending on how your category is configured, holidays may or may not count toward the days deducted from your balance.

---

**Rule 7 — El Salvador only: Vacation 7/8/15 rule**
If your country is El Salvador and you are requesting Vacation, a special rule applies:

- You may only request **7**, **8**, or **15** calendar days per request.
- Your annual vacation total is capped at **15 days**.
- If you have already used 7 days this year, your next request must be 8 days (and vice versa).
- If you have already reached 15 days, you cannot request more vacation until the next year.

---

### 1.5 Acknowledging or declining a supervisor-created request

When your supervisor creates a time-off request for you, you will receive a **notification** in the system. The request starts as **Tentative** and requires your response.

Open the request from your notification or from the My Time Off list, then:

- **Acknowledge** — You accept the request. Status moves to **Acknowledged**.
- **Decline** — You do not accept it. You must provide a **comment** explaining why. Status moves to **Rejected** and your supervisor is notified.

> If you do not act on a Tentative request, the system will send you reminders as the start date approaches (see the Notifications section).

### 1.6 Editing a request

You can edit a **Tentative** or **Acknowledged** request as long as the start date is still far enough in the future to comply with the advance notice rule.

Go to the request detail, make your changes, and save. The balance is adjusted automatically to reflect the difference in days.

### 1.7 Cancelling your own request

You can cancel a request from the detail page. A few conditions apply:

- The request must be in **Tentative** or **Acknowledged** status.
- The cancellation must happen **before the advance-notice deadline** (the same N-days rule that applies to creation). If the start date is too close, self-cancellation is blocked and you must contact your supervisor.

When a request is cancelled, the days are immediately returned to your balance.

### 1.8 Viewing your activity log

Go to **Time Off → Activity** to see a full chronological history of everything that has happened on your requests: when they were created, edited, acknowledged, declined, or cancelled. Each entry shows who made the change and, when applicable, the before and after values.

---

## Part 2 — Supervisor: Managing Your Team's Time Off

### Where to find it

Navigate to **Time Off → Supervisor** from the main menu. This view shows only the team members who report directly to you, as configured in the system.

### 2.1 Your dashboard

[screenshot here]

The supervisor view gives you an overview of:

- **Current month time-offs** — who is out this month and how many days.
- **By-month chart** — requests distributed across the calendar year.
- **By-country chart** — useful if you manage a cross-border team.
- **Yearly summary** — total days per team member for the year.

### 2.2 Creating a request on behalf of a team member

1. From the supervisor view, select the team member.
2. Fill out the request form: category, start date, end date.
3. Submit.

The request is created as **Tentative**. The team member receives a notification and must acknowledge or decline it (see Part 1, Section 1.5).

> You will see an advisory warning if the request violates the advance-notice period — but as a supervisor, you are not blocked by this rule. Use this override responsibly and communicate clearly with your team member.

### 2.3 Editing a team member's request

Open the request from the team member's list or the management grid. You can edit dates and category on **Tentative** or **Acknowledged** requests. Balance adjustments happen automatically.

### 2.4 Cancelling a team member's request

You can cancel any active (Tentative, Acknowledged, or Rejected) request for a team member. You must provide a **comment** — this becomes part of the audit trail and will be visible to the team member in the activity log.

Cancellation is not restricted by the advance-notice deadline for supervisors. Use this authority with care.

### 2.5 Viewing a team member's balance

From the team member's profile within the supervisor view, you can see their current Workday balance: how many vacation days and personal days they have remaining.

### 2.6 Viewing the full management grid

Navigate to **Time Off → Management** for a global view of all time-off requests across your team. You can filter by month, country, and status. This view is useful for resource planning and for identifying gaps or conflicts in coverage.

### 2.7 Activity log — team scope

Go to **Time Off → Activity** and switch to the **Team** scope. You will see the complete history of changes across all your direct reports' requests: who created, edited, acknowledged, declined, or cancelled, with timestamps and comments.

---

## Part 3 — Notifications

The system sends targeted notifications to keep everyone informed without requiring manual follow-up.

### When you receive a notification

| Event | Who is notified | Type |
|---|---|---|
| Team member creates a request | Supervisor | Informational |
| Supervisor creates a request for you | Team member | **Actionable** (requires acknowledge or decline) |
| Team member declines a request | Supervisor who created it | Informational |

### The 90-day countdown

For every active request, the system automatically sends countdown reminders as the start date approaches. Notifications are sent at these intervals:

- **90 days** before the start date
- **60 days** before
- **30 days** before
- **15 days** before
- **1 day** before

Each reminder goes to:

1. The team member who owns the request.
2. Their direct supervisor.
3. Up to two additional levels up the supervisor chain.

These reminders are designed to ensure no one is surprised by an upcoming absence. A notification is sent at most once per day to avoid duplicates.

---

## Part 4 — Day Calculation: How Your Days Are Counted

The number of days deducted from your balance depends on the configuration of your category and country.

### Calendar days vs. workdays

- **Calendar days** — every day between start and end is counted, including weekends.
- **Workdays** — only Monday through Friday are counted. Weekends are excluded.

Your category is configured one way or the other. Check with your supervisor or HR if you are unsure which applies to you.

### Fixed-duration categories

Some categories have a fixed duration set by the company. When you select one of these categories, the end date is calculated automatically — you only need to pick the start date.

### Half-day support

Certain categories and countries support requesting half a day. If this option is available to you, you will see it in the request form.

---

## Part 5 — Frequently Asked Questions

**Q: I submitted a request but I cannot see it in the list. What happened?**
A: Refresh the page. If it still does not appear, check if you received a validation error when submitting — the request may not have been saved.

---

**Q: My balance did not update after I cancelled a request.**
A: The balance updates instantly. If the number looks wrong, reload the page. If it still looks incorrect, contact your HR team.

---

**Q: I want to cancel a request but the cancel button is not available.**
A: Two situations block self-cancellation: (1) the start date is too close and the advance-notice deadline has passed, or (2) the request is already cancelled or rejected. In the first case, contact your supervisor to cancel on your behalf.

---

**Q: I declined a request my supervisor created, but I changed my mind. Can I undo it?**
A: A declined (Rejected) request cannot be re-acknowledged. Ask your supervisor to cancel the existing request and create a new one.

---

**Q: As a supervisor, can I see requests from people outside my direct team?**
A: The supervisor view is limited to your direct reports. The Management view shows a broader set depending on your access level, but approvals and edits remain restricted to your direct hierarchy.

---

**Q: How do I know if a specific date is a public holiday?**
A: The system validates holidays automatically based on your country. If you attempt to create a request and a holiday validation applies, it will be reflected in your day count or surfaced in a message. You can also ask your HR team for the holiday calendar.

---

## Summary Cheat Sheet

### As a Team Member

| I want to... | Where to go | Prerequisite |
|---|---|---|
| Check my balance | My Time Off → top of page | — |
| Submit a request | My Time Off → form | Enough balance, advance notice met |
| Acknowledge/decline a supervisor request | My Time Off → open the Tentative request | Request must be in Tentative status |
| Edit my request | My Time Off → open request → Edit | Request must be Tentative or Acknowledged |
| Cancel my request | My Time Off → open request → Cancel | Must be before notice deadline |
| See change history | Time Off → Activity | — |

### As a Supervisor

| I want to... | Where to go | Prerequisite |
|---|---|---|
| See team overview | Time Off → Supervisor | — |
| Create a request for someone | Supervisor view → select member → form | Member must be active |
| Edit a team member's request | Supervisor view → open request → Edit | Request must be Tentative or Acknowledged |
| Cancel a team member's request | Supervisor view → open request → Cancel | Must provide a comment |
| Check a member's balance | Supervisor view → select member → balance | — |
| See full team history | Time Off → Activity → Team scope | — |
| View global team calendar | Time Off → Management | — |

---

*For issues or questions not covered here, contact your HR representative or submit a support ticket through the internal helpdesk.*
