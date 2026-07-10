# Top Performers — Admin Manual

> **Version 1.0 · June 2026**
> This manual is for **administrators and committee members**. It covers cycle management, anonymization review, administrative nominations, and the committee decision process. For the employee-facing nominations and voting guide, see the [User Manual](user-manual-top-performers.md).

---

## Overview

Admins are responsible for the full lifecycle of each Top Performers cycle: creating it, opening and closing phases, reviewing and anonymizing nominations, and handing results off to the committee. Committee members handle the final step — selecting and confirming the winner.

### Who does what

| Role | Responsibilities |
|---|---|
| **Admin / Supervisor** | Create and manage cycles, submit administrative nominations, trigger anonymization, review and approve anonymized text |
| **Committee Member** | Review the leaderboard, select a winner, dual-confirm the decision |

> Committee members have read access to the leaderboard and candidate details but cannot manage cycles or trigger anonymization. Admins can vote if they hold the TopPerformers permission but their votes carry adjusted weights (see [Voting Weight](#voting-weight)).

---

## Part 1 — Cycle Management

### 1.1 Creating a cycle

Navigate to **Top Performers → Admin → Cycles** and click **New Cycle**.

Fill in the following fields:

| Field | Description |
|---|---|
| **Cycle name** | A descriptive label for this award period (e.g. "Q2 2026 Top Performers") |
| **Nominations start** | Date and time when employees can begin submitting nominations |
| **Nominations end** | Date and time when the nomination window closes |
| **Voting start** | Date and time when voting opens — must be after nominations end |
| **Voting end** | Date and time when voting closes — must be after voting start |

Once saved, the cycle is created in a **pending** state. The system automatically transitions to **Nominations Open** at the nominations start date and time.

### 1.2 Editing a cycle

You can edit cycle dates and name before the cycle reaches the **Voting Open** phase. After that, date fields are locked to preserve the integrity of the process.

### 1.3 Cycle status lifecycle

Cycles move through the following statuses. Some transitions happen automatically; others require a manual admin action.

```
[ Pending ]
     │  (auto — at nominations start date)
     ▼
[ Nominations Open ]  ◄── employees can nominate
     │  (auto — at nominations end date, or admin advances manually)
     ▼
[ Voting Open ]  ◄── employees can vote
     │  (auto — at voting end date, or admin advances manually)
     ▼
[ Anonymization In Progress ]  ◄── admin triggers AI batch
     │  (admin advances after review is complete)
     ▼
[ Awaiting Committee ]  ◄── leaderboard visible; committee decides
     │  (triggered by dual committee confirmation)
     ▼
[ Results Published ]  ◄── winner announced; cycle closed
```

**Manual advancement:** You can push a cycle to the next status before its scheduled date using the **Advance Status** button on the cycle detail page. Use this only when needed (e.g. nominations are clearly exhausted before the window closes). Status regressions are not supported.

---

## Part 2 — Administrative Nominations

Administrative nominations carry more weight in the process because they come from someone with direct visibility into the nominee's work. They have stricter content requirements than peer nominations.

### 2.1 Who can submit an admin nomination?

Any active supervisor who has direct reports. You can only nominate people in your direct organizational hierarchy — the system verifies this and will block nominations outside your chain.

### 2.2 Submitting an administrative nomination

Navigate to **Top Performers → Nominate → Administrative Nomination** during the Nominations Open phase.

**Nominee** *(required)*
The ComboBox shows only your direct reports. Select one.

**Achievement** *(required, 150–1 500 characters)*
Describe what the nominee did and why it was outstanding. Minimum is higher than peer nominations — the expectation is a thorough account.

**How they exceeded role expectations** *(required, 100–600 characters)*
Explain specifically what they did that went beyond what their role normally requires.

**Customer or business impact** *(required, 80–500 characters)*
Describe the concrete effect on customers, the business, or the team.

**Quantitative metrics** *(required — at least one row)*
Add the numbers that back up the achievement. Each row has:

| Field | Example |
|---|---|
| Metric name | CSAT score |
| Metric value | 94% |
| Benchmark / goal *(optional)* | 88% target |

Add as many rows as needed. At least one row is required.

**Confidence level** *(required, scale 1–5)*

| Level | Meaning |
|---|---|
| 1 | Good performance but not exceptional |
| 2 | Notable — above average |
| 3 | Definitely deserves recognition |
| 4 | Strong candidate for the award |
| 5 | Best nomination of this cycle |

Be honest. This score is visible to committee members and informs their review.

**TELUS values alignment** *(optional)*
Check the values this achievement demonstrates and add a brief description.

**Supporting files** *(optional)*
Attach up to 3 files — reports, screenshots, data exports, or other evidence.

---

## Part 3 — Nomination Overview (Admin View)

During the Nominations Open phase, navigate to **Top Performers → Admin → Nominations** to see all submitted nominations across the cycle.

The table shows:
- Nominee name
- Nomination type (Peer, Admin, Customer)
- Submission date
- Current anonymization status

Use this view to monitor submission volume and identify which nominations will need manual review after AI processing.

---

## Part 4 — Anonymization

Before voting opens, all nomination text must be anonymized so that voters evaluate achievements rather than individuals. The anonymization process removes names, specific dates, role titles, and other identifying details.

### 4.1 When to run anonymization

Run anonymization after the nominations window closes and before you open voting. The cycle must be in the **Voting Open** phase or the admin can trigger it during the **Nominations Open** phase to get a head start.

Navigate to **Top Performers → Admin → Anonymization Review**.

### 4.2 Running the AI batch

Click **Process with AI**. The system sends all pending nominations to the AI model, which produces an anonymized version of each one.

The batch returns a summary:

| Outcome | Meaning |
|---|---|
| Processed | AI produced a clean anonymized version — auto-approved |
| Needs Review | AI flagged uncertainty — requires your manual approval |
| Failed | Processing error — nomination stays in Pending |

### 4.3 Reviewing flagged nominations

The **Pending** tab shows nominations with status **Needs Review** or **Pending** (failed).

For each flagged nomination:
1. Read the original text and the AI-generated anonymized version side by side
2. If the anonymized version is accurate and identifies no individuals, click **Approve**
3. If it needs corrections, edit the anonymized text directly in the text field, then **Approve**

> Do not approve a nomination that still contains a real name, a specific date that identifies an individual, or a role title unique enough to identify someone.

The **Approved** tab shows nominations that are cleared for voting. These are what voters will see.

### 4.4 Advancing after anonymization

Once all nominations are either Approved or intentionally excluded, advance the cycle to **Awaiting Committee** using the status advancement button on the cycle detail page. This publishes the leaderboard and locks the nomination list for the committee.

---

## Part 5 — Leaderboard and Committee Decision

### 5.1 The leaderboard

After the cycle reaches **Awaiting Committee**, the leaderboard becomes available to both admins and committee members. It ranks nominees by their total weighted vote points.

**Columns:**

| Column | Description |
|---|---|
| Nominee | Full name |
| Weighted points | Sum of all votes adjusted by voter weight multipliers |
| Vote count | Number of unique voters who included this nominee |
| Nominations | Number of nominations received |
| Rank distribution | Bar breakdown of how many voters placed them at each rank |

Click any row to open the **Candidate Detail panel**, which shows:
- All nominations received (full anonymized text)
- Nomination type for each (Admin, Peer, Customer)
- Admin nominations include: confidence level, exceeds-expectations text, client impact, and metrics table
- Vote distribution chart

The leaderboard can be exported as a CSV.

### 5.2 Voting weight (for reference)

Raw vote points (1st = 10 pts, 2nd = 8 pts, etc.) are multiplied by a weight factor based on the voter's relationship to the nominee. This is automatic — no configuration required.

**Admin / supervisor voters:**
- Voter is in the nominee's direct management chain → **0.7×** (reduces potential bias)
- Voter is outside the nominee's hierarchy → **1.5×** (boosts cross-org endorsements)

**Non-admin voters:**
- Voter is in the same Line of Business as the nominee → **0.7×**
- Voter is in a different Line of Business → **1.0×**

This means a nomination with fewer total votes can outscore one with more votes if the supporting votes came from outside the nominee's immediate circle.

### 5.3 Making the committee decision

The committee decision requires **two different committee members** to confirm the same winner. Neither can confirm the other's choice if both try to do so as the same person.

**Step 1 — First committee member**

1. Open the leaderboard and click **Committee Decision**
2. The form shows the top 5 nominees by weighted points
3. Select the winner from the ComboBox
4. Write the decision justification (minimum 100 characters) — this text will be published with the winner announcement
5. Click **Save Decision**

> The cycle does not change status yet. A second committee member must independently confirm.

**Step 2 — Second committee member**

1. Open the same **Committee Decision** dialog
2. The first member's selection is shown for review
3. If in agreement, click **Confirm Decision**
4. The system validates that this is a different person from the first confirmer

**On dual confirmation:**
- Cycle status changes to **Results Published**
- Winner and justification become visible to all users
- No further changes are possible — the decision is permanent

> If the committee disagrees on the winner, the first member's saved decision can be overwritten before the second confirmation is made. Once confirmed by two members, it cannot be changed.

---

## Part 6 — Permissions Reference

| Permission | Who holds it | What it unlocks |
|---|---|---|
| `TopPerformers` read | All team members | View cycle info, leaderboard (anonymized during voting) |
| `TopPerformers` create | All team members | Submit nominations, submit votes |
| `TopPerformers_Admin` read | Admins | View nomination overview with author details |
| `TopPerformers_Admin` create | Admins | Create/edit cycles, trigger anonymization, approve nominations, submit admin nominations |
| `ComitatTopPerformers` read | Committee members | View leaderboard and candidate detail panel |
| `ComitatTopPerformers` create | Committee members | Record and confirm committee decision |

Permissions are assigned through the Security module. A user can hold multiple permissions simultaneously (e.g. a supervisor can have both Admin and Committee access).

---

## Quick Reference — Admin Checklist per Cycle

```
□ Create cycle with correct nomination and voting dates
□ Monitor nominations during the nominations window
□ After nominations close: run AI anonymization batch
□ Review and approve any "Needs Review" nominations
□ Advance cycle to Awaiting Committee
□ Notify committee members that leaderboard is ready
□ Confirm dual committee decision has been recorded
□ Verify Results Published status and winner announcement is visible
```
