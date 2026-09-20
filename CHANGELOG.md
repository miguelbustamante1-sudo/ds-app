# Changelog

All notable changes to this app are documented in this file.

## Versioning

This project uses a three-part version number: **MAJOR.FEATURE.PATCH**

- **MAJOR** — a major overhaul or breaking change to the app (e.g. `2.0.0` → `3.0.0`)
- **FEATURE** — a new feature or capability added (e.g. `2.0.0` → `2.1.0`)
- **PATCH** — a bug fix or small correction (e.g. `2.1.0` → `2.1.1`)

Each release below corresponds to a merge from the `main` development branch into the `current` production branch.

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
