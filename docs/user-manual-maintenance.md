# Maintenance — User Manual

> **Version 1.0 · March 2026**
> This manual covers the Maintenance module: all system catalogs that administrators manage to support the rest of the application. Each section explains what the catalog stores, how to operate it, and where changes will be reflected throughout the system.

---

## What is the Maintenance module?

The Maintenance module is the administrative backbone of the application. It contains all the reference catalogs that feed dropdowns, validation rules, and relationships in every other module. Changes made here propagate immediately to the rest of the system — adding a new entry makes it selectable, deactivating or deleting one removes it from future choices.

> **Access is permission-controlled.** Each catalog is protected by its own permission. You will only see the catalogs your administrator has granted you access to.

---

## Catalog Overview

| Catalog | What it manages | Affects |
|---|---|---|
| **Time Off Types** | Categories of absence | My Time Off, Supervisor Time Off |
| **Time Off Rules by Country** | Per-country rules for each category | My Time Off, Supervisor Time Off |
| **Time Off Statuses** | Workflow states for requests | Time Off lifecycle everywhere |
| **Holidays** | Country-specific public holidays | Time Off date picker and balance calculations |
| **Team Members** | Employee profiles | All modules |
| **Supervisor Assignments** | Who reports to whom | My Team, Supervisor Time Off, Notifications |
| **Clients** | Client organizations | Projects, Endorsements |
| **Client Contacts** | Contacts within each client | Project Assignments |
| **Projects** | Active client projects | Project Assignments, Endorsements |
| **Countries** | Country list and configuration | Team Members, Holidays, Time Off Rules |
| **Regions** | Groupings of countries | Countries |
| **Roles** | Domain job roles | Team Members |
| **Tier Bands** | Seniority/compensation tiers | Team Members, Endorsements |
| **Functional Areas** | Organizational functions | Project Assignments |
| **Bonus Categories** | Top-level bonus groupings | Endorsements |
| **Bonus Subcategories** | Detailed bonus definitions by country | Endorsements |
| **Workday Info** | HR data sourced from Workday | Team Member profiles, Time Off balances |

---

## Part 1 — Time Off Types

### Where to find it

Navigate to **Maintenance → Time Off Types**.

### 1.1 What this catalog manages

Time Off Types (also called Categories) define the kinds of absence a team member can request. Each entry has:

| Field | Description |
|---|---|
| **Name** | The label shown in request forms and reports (e.g., Vacation, Sick Leave, Personal Day) |

### 1.2 Where changes appear in the application

> **My Time Off → Category dropdown:** The list of categories a team member can choose when submitting a request is built from this catalog — filtered to the ones enabled for their country (see Part 2, Time Off Rules by Country). Adding a new type here does **not** make it immediately available; you must also create a rule for the relevant country in the Time Off Rules by Country catalog.

> **Supervisor Time Off → Category dropdown (when creating on behalf):** Supervisors see the same filtered list when creating a request for a team member.

> **Reports and activity logs:** The category name is displayed throughout all time-off history and reports.

### 1.3 Common operations

- **Add a type:** Click **New**, enter the name, and save. The type will not appear in any request form until a country rule is created for it.
- **Delete a type:** Only possible if the type has no associated country rules or existing requests. If it does, deactivate it via the country rule instead.

---

## Part 2 — Time Off Rules by Country

### Where to find it

Navigate to **Maintenance → Time Off Rules by Country** (also referred to as Category-Country).

### 2.1 What this catalog manages

This catalog links each Time Off Type to each Country and defines the exact rules that govern how requests for that combination behave.

| Field | Description |
|---|---|
| **Category** | The time off type (from the Time Off Types catalog) |
| **Country** | The country this rule applies to |
| **Status** | Whether this category is currently active for this country |
| **Allow Half Day** | Whether team members in this country can request a half day for this category |
| **Fixed Duration** | Whether the request has a fixed number of days set by the company |
| **Fixed Days** | If fixed duration is enabled, the exact number of days |
| **Calendar Days** | Whether day counting uses calendar days (including weekends) instead of workdays |
| **Days Before** | Minimum advance notice required (in calendar days) before the start date |

### 2.2 Where changes appear in the application

> **My Time Off → Category dropdown:** Only categories with an active rule for the team member's country appear in this dropdown. Disabling a rule (Status = inactive) removes that category from the dropdown for all team members in that country.

> **My Time Off → Half-day option:** The half-day checkbox on the request form only appears if the rule for the team member's country and selected category has **Allow Half Day** enabled.

> **My Time Off → End date field:** If a category is configured with **Fixed Duration**, the end date field is disabled and auto-calculated. Team members only pick the start date.

> **My Time Off → Advance notice validation:** The **Days Before** value is enforced when submitting a request. If the selected start date is closer than the configured minimum, the form shows an error with the earliest valid date.

> **My Time Off → Day count:** Whether the balance deducted uses calendar days or workdays is determined by the **Calendar Days** flag on this rule.

> **Supervisor Time Off:** All the same rules apply when a supervisor creates a request on behalf of a team member. Supervisors see an advisory warning if advance notice is not met but are not blocked.

### 2.3 Common operations

- **Enable a category for a country:** Create a new rule linking the category to the country with Status = active.
- **Disable a category for a country:** Edit the rule and set Status = inactive. Existing requests are not affected; no new requests can be created for this combination.
- **Adjust notice period:** Edit the **Days Before** value. The new value applies to all future requests from that moment.

---

## Part 3 — Time Off Statuses

### Where to find it

Navigate to **Maintenance → Time Off Statuses**.

### 3.1 What this catalog manages

Statuses define the lifecycle states a time-off request moves through.

| Field | Description |
|---|---|
| **Name** | The status label (e.g., Tentative, Acknowledged, Rejected, Cancelled) |

### 3.2 Where changes appear in the application

> **All Time Off views:** Status badges displayed on every request row and detail page come from this catalog. Status names appear in the activity log, notifications, and reports.

> **Workflow logic:** The system uses status names internally to drive transitions (e.g., identifying what a "Tentative" or "Cancelled" request is). **Do not rename or delete the core workflow statuses** (Tentative, Acknowledged, Rejected, Cancelled) as doing so will break time-off request processing.

### 3.3 Common operations

- **Add a status:** Only add statuses if you are extending the workflow intentionally. Consult your technical team before doing so.
- **Rename:** Renaming a status changes the label everywhere it appears. Avoid renaming the four core statuses listed above.

---

## Part 4 — Holidays

### Where to find it

Navigate to **Maintenance → Holidays**.

### 4.1 What this catalog manages

Holidays defines country-specific public holidays that the system uses when validating and calculating time-off requests.

| Field | Description |
|---|---|
| **Country** | The country this holiday applies to |
| **Name** | The holiday name (e.g., "Independence Day") |
| **Date** | The calendar date of the holiday |
| **Recurring** | If enabled, the holiday repeats every year on the same date |
| **Half Day** | Whether this holiday is observed as a half day |
| **Active** | Whether the holiday is currently in effect |

### 4.2 Where changes appear in the application

> **My Time Off → Date picker:** Active holidays for the team member's country are highlighted in amber in the calendar. Team members can see at a glance which dates are public holidays.

> **My Time Off → Start date validation:** A request cannot start on a public holiday. Highlighted dates in the picker are disabled as start dates; selecting them shows an error.

> **My Time Off → Balance calculation:** Whether holidays within a request date range reduce the balance depends on the country configuration:
> - **El Salvador:** Holidays within the range count as vacation days and are deducted from the balance. An alert lists the affected holidays.
> - **Guatemala:** Weekday public holidays within the range are excluded from the day count. The balance deducted is the net workdays, not the gross range.

> **Supervisor Time Off:** The same holiday highlights and alerts appear when a supervisor creates or edits a request on behalf of a team member.

### 4.3 Common operations

- **Add a holiday:** Click **New**, select the country, enter the name and date, set recurring and active as appropriate.
- **Deactivate a holiday:** Edit the entry and set Active = false. It will no longer appear in date pickers or affect validation.
- **Non-recurring holidays:** For one-off observances, add the holiday with Recurring = false. The system will treat it only for the year of the date entered.

---

## Part 5 — Team Members

### Where to find it

Navigate to **Maintenance → Team Members**.

### 5.1 What this catalog manages

Team Members is the central employee directory. Every person in the system must have a team member record.

| Field | Description |
|---|---|
| **Names / Surnames** | Legal first and last name |
| **Known As** | Nickname or preferred name |
| **Start Date** | Employment start date |
| **End Date** | Employment end date (optional — used for terminations) |
| **Country** | Country where the member is based |
| **Workday ID** | External identifier linking to the Workday HCM system |
| **Seniority** | Seniority level |
| **Primary Role** | Job role (from the Roles catalog) |
| **Tier Band** | Compensation band (from the Tier Bands catalog) |

### 5.2 Where changes appear in the application

> **My Team:** All supervisor reports are drawn from team member records. Name, role, country, and Workday data shown in the profile page come directly from this catalog.

> **My Time Off / Supervisor Time Off:** The requesting team member's country determines which time off categories, holiday rules, and balance validations apply. Changing a team member's country will change the rules they are subject to.

> **Time Off → End date rule:** If an End Date is set on the team member record, the system prevents creating a request whose end date exceeds the employment end date.

> **Supervisor Time Off → Team member list:** Only active team members (no End Date, or End Date in the future) appear as selectable subjects in the supervisor form.

> **Project Assignments and Endorsements:** Team members are the subjects of project allocations and endorsement records.

> **Workday Information on profiles:** The Workday ID field links this record to the Workday Info catalog. If not linked, the Workday section on profile pages shows a "No Workday ID linked" notice.

### 5.3 Common operations

- **Add a team member:** Click **New** and fill all required fields. Assign the correct country — this cannot be changed without affecting active time-off rules.
- **Terminate a member:** Set the **End Date**. This signals the end of employment and restricts future time-off requests beyond that date.

---

## Part 6 — Supervisor Assignments

### Where to find it

Navigate to **Maintenance → Supervisor Assignments**.

### 6.1 What this catalog manages

Supervisor Assignments define the reporting hierarchy: who reports to whom, and for what period.

| Field | Description |
|---|---|
| **Team Member** | The subordinate in the relationship |
| **Supervisor** | The supervisor (must be a different team member) |
| **Start Date** | When this supervision relationship began |
| **End Date** | When it ends (optional — leave blank for current relationships) |

### 6.2 Where changes appear in the application

> **My Team:** A supervisor's "My Team" list is built exclusively from their active supervisor assignments. Adding or removing an assignment immediately changes who appears in their team list.

> **Supervisor Time Off:** The supervisor view shows only the team members linked to the current user via this catalog. A supervisor can only create, edit, or cancel requests for their direct reports.

> **Notifications:** Time-off notifications are sent up to three levels of the supervisor chain. The chain is resolved from this catalog at the time the notification is sent. Ensuring assignments are up to date prevents notifications from going to the wrong people.

> **Reports — My Reports:** The `direct` vs. `indirect` report distinction in team hierarchy views is computed from the chain of supervisor assignments.

### 6.3 Common operations

- **Reassign a direct report:** End-date the current assignment and create a new one with the new supervisor and a new start date.
- **Self-assignment prevention:** The system will reject any assignment where the supervisor and team member are the same person.

---

## Part 7 — Clients

### Where to find it

Navigate to **Maintenance → Clients**.

### 7.1 What this catalog manages

Clients are the external organizations the company works with.

| Field | Description |
|---|---|
| **Name** | The client's organization name |

### 7.2 Where changes appear in the application

> **Projects → Client dropdown:** When creating or editing a project, the client is selected from this catalog. Only clients in this list can be linked to projects.

> **Endorsements → Client selection:** Endorsements reference the client associated with the work being endorsed.

> **Project Assignments:** Client information flows through from the project record to assignment views.

### 7.3 Common operations

- **Add a client:** Click **New**, enter the name, and save. The client immediately becomes selectable when creating projects.
- **Delete a client:** Only possible if no projects or client contacts are linked to it.

---

## Part 8 — Client Contacts

### Where to find it

Navigate to **Maintenance → Client Contacts**.

### 8.1 What this catalog manages

Client Contacts are individuals within a client organization who are points of contact for projects.

| Field | Description |
|---|---|
| **Client** | The parent client organization |
| **Name** | Contact's full name |
| **Email** | Contact's email address |
| **Phone Number** | Contact's phone number |
| **Position** | Contact's job title or role (optional) |
| **Active** | Whether the contact is currently active |

### 8.2 Where changes appear in the application

> **Project Assignments:** Client contacts can be referenced on project assignment records to identify who the team member coordinates with on the client side.

### 8.3 Common operations

- **Deactivate a contact:** Set Active = false instead of deleting, to preserve historical references.

---

## Part 9 — Projects

### Where to find it

Navigate to **Maintenance → Projects**.

### 9.1 What this catalog manages

Projects are engagements or workstreams tied to a client.

| Field | Description |
|---|---|
| **Name** | The project name |
| **External ID** | An optional identifier from an external system |
| **SOW** | Statement of Work reference |
| **Start Date / End Date** | Project timeline |
| **Active** | Whether the project is currently active |
| **Client** | The client this project belongs to (from the Clients catalog) |

### 9.2 Where changes appear in the application

> **Project Assignments → Project dropdown:** Only active projects appear as selectable options when creating a project assignment. Setting Active = false removes a project from this dropdown for future assignments.

> **Endorsements → Project selection:** Active projects appear in endorsement forms when specifying the project context.

### 9.3 Common operations

- **Close a project:** Set Active = false and fill in the End Date. The project will no longer appear in new assignment or endorsement forms.
- **Filter by client:** Use the client filter in the project list to see only projects for a specific client.

---

## Part 10 — Countries

### Where to find it

Navigate to **Maintenance → Countries**.

### 10.1 What this catalog manages

Countries is the geographic reference list used throughout the application.

| Field | Description |
|---|---|
| **Name** | The country's full name |
| **Region** | The region this country belongs to (from the Regions catalog) |
| **ISO Code** | Two-character ISO country code (e.g., SV, GT) |
| **Currency Symbol** | The country's currency symbol |

### 10.2 Where changes appear in the application

> **Team Members → Country dropdown:** The country assigned to a team member is selected from this catalog.

> **Time Off Rules by Country:** Country entries are the targets for rules in the Time Off Rules catalog. A country must exist here before rules can be created for it.

> **Holidays → Country dropdown:** Holidays are associated with countries from this catalog.

> **Endorsements → Country selection:** Country is referenced when creating endorsements with country context.

> **Reports → Country filter:** The country list used in report filters comes from this catalog.

> **Functional Areas and Bonus Subcategories:** Both can be scoped to a specific country using entries from this catalog.

---

## Part 11 — Regions

### Where to find it

Navigate to **Maintenance → Regions**.

### 11.1 What this catalog manages

Regions are geographic groupings that organize countries.

| Field | Description |
|---|---|
| **Name** | The region name (e.g., Central America, North America) |

### 11.2 Where changes appear in the application

> **Countries → Region dropdown:** When creating or editing a country, the region is selected from this catalog.

> **Country filtering:** Some views allow filtering countries by region, which relies on this relationship.

---

## Part 12 — Roles

### Where to find it

Navigate to **Maintenance → Roles**.

### 12.1 What this catalog manages

Roles define the job roles or titles that team members hold within the organization.

| Field | Description |
|---|---|
| **Name** | The role title (e.g., Software Engineer, Product Manager) |
| **Description** | A brief description of the role (optional) |

### 12.2 Where changes appear in the application

> **Team Members → Primary Role dropdown:** The role assigned to a team member is selected from this catalog. Every team member record requires a role. Adding a new role makes it immediately selectable.

> **My Team → Role column:** The role name displayed in the My Team list and member profile pages comes from the role linked to the team member record.

---

## Part 13 — Tier Bands

### Where to find it

Navigate to **Maintenance → Tier Bands**.

### 13.1 What this catalog manages

Tier Bands represent compensation or seniority levels within the organization.

| Field | Description |
|---|---|
| **Description** | The tier band label (e.g., Band 1, Senior, Principal) |

### 13.2 Where changes appear in the application

> **Team Members → Tier Band dropdown:** When creating or editing a team member, the tier band is selected from this catalog. Adding a new tier band makes it immediately available.

> **Endorsements → Tier Band field:** Endorsements capture the team member's tier band at the time of the endorsement. The dropdown shows all entries from this catalog.

---

## Part 14 — Functional Areas

### Where to find it

Navigate to **Maintenance → Functional Areas**.

### 14.1 What this catalog manages

Functional Areas are organizational units or disciplines that team members can be associated with through project assignments.

| Field | Description |
|---|---|
| **Name** | The functional area name (e.g., Engineering, Design, Operations) |
| **Country** | Optional — scope the area to a specific country |

### 14.2 Where changes appear in the application

> **Project Assignments → Functional Area dropdown:** When creating a project assignment, the functional area is selected from this catalog. Country-scoped areas only appear when the team member's country matches.

---

## Part 15 — Bonus Categories

### Where to find it

Navigate to **Maintenance → Bonus Categories**.

### 15.1 What this catalog manages

Bonus Categories are the top-level groupings for bonuses used in endorsements.

| Field | Description |
|---|---|
| **Name** | The category name (e.g., Performance, Retention) |

### 15.2 Where changes appear in the application

> **Endorsements → Bonus section:** When adding a bonus to an endorsement, the category is selected first. The category choice then filters which subcategories are available. Adding a new category here makes it selectable in the endorsement form.

---

## Part 16 — Bonus Subcategories

### Where to find it

Navigate to **Maintenance → Bonus Subcategories**.

### 16.1 What this catalog manages

Bonus Subcategories define the detailed bonus types within each category, including country scoping and custom metadata fields.

| Field | Description |
|---|---|
| **Category** | The parent bonus category |
| **Name** | The subcategory name |
| **Country** | The country this subcategory applies to |
| **Default Amount** | A pre-filled default amount (optional) |
| **Metadata** | Custom fields for this subcategory (each field has a name and type: text, number, date, or boolean) |

### 16.2 Where changes appear in the application

> **Endorsements → Bonus subcategory dropdown:** After selecting a category, the subcategory dropdown is filtered to entries matching the relevant country. Adding a new subcategory immediately makes it available in the endorsement form for that country.

> **Endorsements → Bonus detail form:** The metadata fields defined on a subcategory appear as additional input fields when a user selects that subcategory on an endorsement bonus entry.

---

## Part 17 — Workday Info

### Where to find it

Navigate to **Maintenance → Workday Info**.

### 17.1 What this catalog manages

Workday Info stores HR data synchronized from the Workday HCM system. It is linked to Team Member records via the Workday ID.

| Field | Description |
|---|---|
| **WDID** | Workday identifier (primary key) |
| **Hire Date** | Date of hire as recorded in Workday |
| **Corporate Email / Personal Email** | Email addresses |
| **Cellphone / Home Phone** | Phone numbers |
| **Birth Date** | Date of birth |
| **Parenthood** | Whether parenthood status is indicated |
| **Work Style** | Remote, Hybrid, On-site, etc. |
| **Gender** | As recorded in Workday |
| **Billing Status** | Current billing status |
| **Cost Center Hierarchy / Names** | Cost center information |
| **Direct Manager** | Direct manager as recorded in Workday |
| **Vacation** | Available vacation day balance |
| **Personal Days** | Available personal day balance |

### 17.2 Where changes appear in the application

> **My Team → Member profile → Workday Information section:** All fields from this catalog are shown in the Workday Information section of the team member profile page. If no Workday Info record is linked (via matching WDID on the team member record), the section shows a "No Workday ID linked" notice.

> **My Time Off → Available balance cards:** The **Vacation** and **Personal Days** values from this catalog are displayed as the available balance on the My Time Off page. These values drive the balance validation rule — a request that exceeds the available balance cannot be submitted.

> **Supervisor Time Off → Team member balance:** When a supervisor reviews a team member's balance, the values shown come from this catalog.

---

## Part 18 — Common Operations Across All Catalogs

### 18.1 Creating a record

1. Navigate to the catalog page.
2. Click **New** (or the equivalent add button).
3. Fill in all required fields.
4. Click **Save**.

The new record is immediately active and available in all downstream dropdowns and selectors.

### 18.2 Editing a record

1. Find the record in the list.
2. Click the record row or the edit action.
3. Modify the fields.
4. Click **Save**.

Changes take effect immediately. Any form or view that references this record will reflect the updated values on next load.

### 18.3 Deleting a record

Deletion is only possible when the record has no dependent data linked to it. If dependencies exist, the system will prevent the deletion and display an error. In most cases, the preferred approach is to deactivate or end-date the record rather than deleting it, to preserve historical references.

### 18.4 Searching and filtering

All catalog lists support searching by name or other visible fields. Use the search bar to filter the list in real time.

---

## Part 19 — Frequently Asked Questions

**Q: I added a new Time Off Type but it does not appear in the My Time Off dropdown. Why?**
A: A Time Off Type only appears in request forms once a Time Off Rule by Country is created for it, linking that type to the team member's country with Status = active. Go to Maintenance → Time Off Rules by Country and create the rule.

---

**Q: I deleted a holiday but the date is still highlighted amber in the date picker.**
A: Reload the page. The date picker fetches holidays fresh on each load. If it persists after reload, verify that the holiday record was actually deleted or set to inactive.

---

**Q: A team member's Workday balance shows 0 or is missing. What should I check?**
A: Verify that the team member record has a **Workday ID** set. Then verify that a Workday Info record exists with a matching WDID. If the record exists and the balance is still 0, the Workday sync may need to be refreshed by your technical team.

---

**Q: A project is still appearing in the Project Assignments dropdown even though it is complete.**
A: Edit the project in Maintenance → Projects and set **Active = false**. This immediately removes it from all future assignment dropdowns.

---

**Q: A supervisor's My Team list is missing a team member who should be there.**
A: Check Maintenance → Supervisor Assignments. Ensure there is an active assignment linking that team member to the supervisor with no End Date (or an End Date in the future). If the assignment is missing, create it.

---

**Q: Can I change a team member's country?**
A: Yes, by editing the team member record. Be aware that this changes which time-off categories, holiday rules, and country-specific validations apply to them going forward. It does not affect past requests.

---

**Q: I renamed a Time Off Status and now something broke.**
A: The four core statuses — Tentative, Acknowledged, Rejected, Cancelled — are referenced by name in the system's workflow logic. Renaming them will break time-off processing. Contact your technical team to restore the original names.

---

## Summary Cheat Sheet

| I want to... | Catalog to change | Downstream effect |
|---|---|---|
| Add a new absence category | Time Off Types | Must also add a rule in Time Off Rules by Country for each relevant country |
| Make a category available in a country | Time Off Rules by Country | Appears in My Time Off and Supervisor Time Off dropdowns for that country |
| Remove a category for a specific country | Time Off Rules by Country → set inactive | Disappears from dropdowns for that country |
| Add a public holiday | Holidays | Date is highlighted in date pickers; start-date validation applies |
| Add a new employee | Team Members | Person becomes available in all modules |
| Terminate an employee | Team Members → set End Date | Blocks time-off requests beyond that date |
| Reassign a direct report to another supervisor | Supervisor Assignments | Changes My Team list, Supervisor Time Off access, and notification chain |
| Add a new client | Clients | Becomes selectable when creating projects and endorsements |
| Close a project | Projects → set inactive | Removed from Project Assignment and Endorsement dropdowns |
| Add a new job role | Roles | Becomes selectable in Team Member form |
| Add a new tier band | Tier Bands | Becomes selectable in Team Member and Endorsement forms |
| Add a bonus type for a country | Bonus Subcategories | Appears in Endorsement bonus form for that country |
| Update an employee's leave balance | Workday Info | Balance cards in My Time Off and Supervisor view update immediately |

---

*For issues or questions not covered here, contact your HR representative or submit a support ticket through the internal helpdesk.*
