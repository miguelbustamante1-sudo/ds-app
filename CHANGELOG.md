# Changelog

All notable changes to this app are documented in this file.

## Versioning

This project uses a three-part version number: **MAJOR.FEATURE.PATCH**

- **MAJOR** — a major overhaul or breaking change to the app (e.g. `2.0.0` → `3.0.0`)
- **FEATURE** — a new feature or capability added (e.g. `2.0.0` → `2.1.0`)
- **PATCH** — a bug fix or small correction (e.g. `2.1.0` → `2.1.1`)

Each release below corresponds to a merge from the `main` development branch into the `current` production branch.

## [2.9.0] - 2026-09-24

### Added

**Time Off**
- Time Off Exception list: "Show Past" and "Show Cancelled" toggle filters, hiding past-dated and Cancelled/Rejected/Split records by default
- Time Off Exception page: "Back to Hub" button linking to the Time Off hub

### Changed

**Time Off**
- Time Off Exception list now uses the shared status badge helper and corrected DataGrid record-count/pagination-size conventions

## [2.8.0] - 2026-09-23

### Added

**Time Off**
- My Time Off summary cards (Total Requests, Pending Requests, Vacation Balance, Personal Days Balance) and a "Back to Hub" button linking to the Employee Self-Service hub

### Changed

**Time Off**
- My Time Off create and edit forms now open inline above the request table instead of in a popup dialog, matching the toggle pattern used elsewhere in the app — the table stays visible while a request is being created or edited

## [2.7.2] - 2026-09-23

### Fixed

**Time Off**
- My Time Off (create and edit) no longer hard-blocks a request that exceeds the employee's available vacation or personal-day balance. This now matches the supervisor flow, which has always treated it as advisory only — the request simply submits.

## [2.7.1] - 2026-09-21

### Fixed

**Holiday Swaps**
- The BSA exception page's "View" button is now disabled until both a team member and an "acting as" person are selected, preventing navigation to the swap detail page without that context

## [2.7.0] - 2026-09-21

### Added

**Time Off**
- New "Short Name" field on Type of TimeOff and Time Off Statuses maintenance pages
- Type of TimeOff and Time Off Statuses external feed/drift-check endpoints (`GET /api/time-offs/external/feed`, `POST /api/time-offs/external/drift-check`) now include the type/status short names alongside their full names

## [2.6.0] - 2026-09-20

### Added

**Time Off**
- Changelog cards on all three time-off detail pages now show a field-level diff (old → new) for each change, plus an action badge (Created/Updated/Cancelled/Approved/Rejected), collapsed by default

**Holiday Swaps**
- The team member/supervisor swap detail page now has a "History" section showing the full audit trail of changes to that swap, with the same field-level diff and action badge treatment as time off
- New BSA "acting as" exception detail page (`/holiday-swap-exception-detail/:swapId`), mirroring the team member/supervisor detail page — includes swap details, status, change history, and Approve/Reject/Edit/Cancel actions (including override confirmation when reviewing a swap that isn't Tentative)

### Changed

**Holiday Swaps**
- The BSA exception swap list's per-row Approve/Reject/Edit/Cancel buttons are replaced by a single "View" action that opens the new exception detail page; review and edit actions for existing swaps now happen there instead of inline on the list

## [2.5.0] - 2026-09-19

### Added

**Time Off**
- Time-off categories now count weekends and holidays independently ("Count Weekends" / new "Count Holidays" flags on the category-country maintenance page) instead of a single combined calendar-days switch; a unified day-calculation engine drives fixed-duration end-date projection and requested-days counting across all six time-off request/edit forms
- Holiday-aware day counting now works for any country, not just El Salvador and Guatemala

**Holiday Swaps**
- Create a single holiday swap for a selected team member directly from the maintenance UI

**Team Members**
- Supervisor pages show the selected team member's country
- Hire date surfaced on the team member report

### Changed

**Dates**
- All date displays standardized to `dd-MMM-yyyy` app-wide

### Fixed

**Time Off**
- Corrected weekend/holiday flag precedence in day counting
- Category-country maintenance list now refreshes automatically after creating or editing a record, instead of showing stale data until a manual reload
- Active holiday-swap lookup now scoped to the subject team member
- Audit logging added to category-country create/update/delete routes (previously missing)
- `TimeOffWithDetailsDTO` now includes `teamMemberId`

**Maintenance**
- Category-country page: added missing "Back to Hub" navigation

## [2.4.2] - 2026-09-20

### Fixed

**Workflow**
- Publishing a template with more than one starting task is now rejected — previously both would activate at once instead of running sequentially per the template's routes
- A task reached by two converging predecessor tasks (a join) no longer gets activated twice; the second predecessor to complete used to re-insert the same ROLE fan-out candidates and fail with a unique constraint error

## [2.4.1] - 2026-09-19

### Fixed

**Workflow**
- Destroying a workflow instance now cancels the time-off request it was authorizing, instead of leaving it stuck in its prior status with no record of the workflow being torn down

## [2.4.0] - 2026-09-19

### Added

**Workflow**
- `DATABASE` execution type: a workflow task can now call a configured stored procedure directly instead of routing through a human task, with publish-time validation and admin authoring support
- Admin Jump onto a `CONTEXT`-assigned task now requires an explicit assignee
- `PendingNotificationScanner` picks up DB-triggered task activations on a schedule
- Team Member Change Authorization workflow example, usable as a reference template

### Changed

**Workflow**
- Notifications, task detail tab routing, and context passthrough on task detail now reflect real data instead of placeholders

### Fixed

**Workflow / Regions / Maintenance**
- Various corrections to template forking, per-outcome step skipping, execution-type field handling, region name lookups, team member detail data, and holiday swap access

## [2.3.0] - 2026-09-17

### Added

**Supervisor Assignments**
- Temporary Supervisor Coverage: a supervisor can temporarily cover another's team for a defined window, with full approval and dashboard authority flowing through automatically — managed on its own page (Maintenance/Governance hubs), with a status indicator and "Manage Coverage" link on the Supervisor Assignments page
- Workday ID is now searchable in the Supervisor and Team Member filters on the Supervisor Assignments page

### Changed

**Supervisor Assignments**
- Retired team members are hidden from the Supervisor Assignments list by default (a Status filter reveals them)

## [2.2.0] - 2026-09-17

### Added

**Time Off**
- External API-key-gated endpoints for third-party integrations: `GET /api/time-offs/external/feed` returns active time-offs (workday id, email, name, dates, status) overlapping a given date range; `POST /api/time-offs/external/drift-check` explains why a previously-seen time-off record is no longer in the feed (unknown workday id, employee inactive, dates changed, status changed, deleted, still valid, or no record found)

## [2.1.0] - 2026-09-14

### Added

**Performance Management**
- Navigate back to any completed phase from the stepper to review it, and edit it while the case is active (FB-03)
- Check-in history grid on the case page (FB-07)
- Manager name and email pre-filled from the team member's L1 manager in the hierarchy, still editable (FB-09)
- Case lists and the case title show `Team Member (WDID) - Case Code - Reason`; search covers all three; HR Partner view gained search (FB-04)
- Hub card linking to the Performance Cases report

### Changed

**Performance Management**
- Case visibility and edits are scoped to the case's Team Leader, their upward hierarchy, the snapshotted OM/AGM/Director/HR Partner, and admins (FB-02)
- OM RCA sign-off can only be recorded by the case's OM (or an admin), notifies the Team Leader, and shows who signed and when (FB-06)
- TM Acceptance Date uses a date picker (FB-05)

### Fixed

**Performance Management**
- "Save Progress" data now reappears when returning to a case (FB-01)
- Document upload limit (5 MB per file) is shown in the UI and oversized files return a clear error (FB-08)

## [2.0.0] - 2026-09-04

### Added

**Design System**
- UDS TELUS color token integration and new hub navigation pattern ([#72](https://github.com/willowtreeapps/TICADS/pull/72), [#73](https://github.com/willowtreeapps/TICADS/pull/73))

**AI / Copilot**
- AI Insight Strip and Chat page backed by the Fuel iX API ([#82](https://github.com/willowtreeapps/TICADS/pull/82))
- Fuel iX Copilot Knowledge Base ([#125](https://github.com/willowtreeapps/TICADS/pull/125))

**Top Performers**
- Full Top Performers feature: cycles, nominations, and voting ([#86](https://github.com/willowtreeapps/TICADS/pull/86), [#89](https://github.com/willowtreeapps/TICADS/pull/89))
- Voting rank badge and cycle gating ([#101](https://github.com/willowtreeapps/TICADS/pull/101))

**Gift Cards**
- Gift Card Catalog Maintenance ([#87](https://github.com/willowtreeapps/TICADS/pull/87))
- Gift card audit fixes ([#96](https://github.com/willowtreeapps/TICADS/pull/96))
- Sprint 2: inventory selection, fulfillment, and documentation ([#110](https://github.com/willowtreeapps/TICADS/pull/110))

**Phone Contracts**
- Phone contracts management, hub page, and sidebar entry ([#90](https://github.com/willowtreeapps/TICADS/pull/90), [#92](https://github.com/willowtreeapps/TICADS/pull/92))
- Cellphone price field; relaxed bill rate requirement for free phones ([#115](https://github.com/willowtreeapps/TICADS/pull/115))

**Payroll / Bonuses**
- Payroll management and bonus impact features ([#93](https://github.com/willowtreeapps/TICADS/pull/93))
- Team member reimbursements and payroll frequency fields ([#120](https://github.com/willowtreeapps/TICADS/pull/120))
- Team member on-call tracking ([#121](https://github.com/willowtreeapps/TICADS/pull/121))
- External bonus intake: API-key-driven batch intake endpoint ([#111](https://github.com/willowtreeapps/TICADS/pull/111), [#123](https://github.com/willowtreeapps/TICADS/pull/123))
- On-call external intake and bulk delete ([#123](https://github.com/willowtreeapps/TICADS/pull/123))
- Other Incomes feature — full backend, frontend, and admin surfaces ([#124](https://github.com/willowtreeapps/TICADS/pull/124))

**Team Members & Org**
- Team member detail page ([#96](https://github.com/willowtreeapps/TICADS/pull/96))
- SOP Knowledge Base and SOP Library ([#96](https://github.com/willowtreeapps/TICADS/pull/96), [#101](https://github.com/willowtreeapps/TICADS/pull/101))
- Per-report permission enforcement ([#106](https://github.com/willowtreeapps/TICADS/pull/106))

**Tasks & Workflow**
- Recurring task templates, tasks hub, and resolve flow improvements ([#97](https://github.com/willowtreeapps/TICADS/pull/97))
- Workflow engine: role assignment, task fan-out, requester comment visibility, explicit outcome-trigger flag ([#129](https://github.com/willowtreeapps/TICADS/pull/129), [#131](https://github.com/willowtreeapps/TICADS/pull/131), [#132](https://github.com/willowtreeapps/TICADS/pull/132))
- Org-hierarchy assignment for supervisor/escalation resolution ([#130](https://github.com/willowtreeapps/TICADS/pull/130))
- Auto-close prior open assignment on supervisor assignment create ([#118](https://github.com/willowtreeapps/TICADS/pull/118))

**Dashboard**
- Click navigation on Awaiting Your Action task items ([#99](https://github.com/willowtreeapps/TICADS/pull/99))
- Flags, Important Dates, and Trivia panels ([#125](https://github.com/willowtreeapps/TICADS/pull/125))
- To-Do panel and Flag Intake ([#126](https://github.com/willowtreeapps/TICADS/pull/126))
- Weekly Flags panel wired to real Standalone Task data ([#127](https://github.com/willowtreeapps/TICADS/pull/127))
- Structured flag detail and resolution drawer for the Weekly Flags panel ([#133](https://github.com/willowtreeapps/TICADS/pull/133))

**Other**
- Laptop Inventory, including MDM inventory columns (device name, OS version, blueprint, tags, last check-in) ([#101](https://github.com/willowtreeapps/TICADS/pull/101), [#116](https://github.com/willowtreeapps/TICADS/pull/116))
- Template builder column sync to preserve CSV mappings on schema drift ([#117](https://github.com/willowtreeapps/TICADS/pull/117))
- Weekly vacation hours view split by month boundary ([#119](https://github.com/willowtreeapps/TICADS/pull/119))
- Performance Management module ([#128](https://github.com/willowtreeapps/TICADS/pull/128))
- API key management promoted to its own Security page, plus permission catalog ([#122](https://github.com/willowtreeapps/TICADS/pull/122), [#123](https://github.com/willowtreeapps/TICADS/pull/123))
- Email admin statistics ([#113](https://github.com/willowtreeapps/TICADS/pull/113))

### Changed

- Phone contracts refactored for Orchestrator pattern compliance and DataGrid filter fix ([#91](https://github.com/willowtreeapps/TICADS/pull/91))
- `lap_laptops` varchar columns widened to 250 ([#112](https://github.com/willowtreeapps/TICADS/pull/112))

### Fixed

- Dashboard panel fetch skipped when the user lacks permission, instead of erroring ([#88](https://github.com/willowtreeapps/TICADS/pull/88))
- Top Performers voting and nomination bugs ([#100](https://github.com/willowtreeapps/TICADS/pull/100))
- Bonus impact team member combobox shows Workday ID and uses a month picker ([#94](https://github.com/willowtreeapps/TICADS/pull/94))
- Holiday swaps no longer re-validate the replacement date on approval ([#114](https://github.com/willowtreeapps/TICADS/pull/114))
- Dashboard task fixes ([#113](https://github.com/willowtreeapps/TICADS/pull/113))
